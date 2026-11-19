/**
 * PERMIRA 2026 — Pengirim & Verifikator OTP Alternatif (Resend & Brevo API)
 * File ini adalah ALTERNATIF untuk Code.gs lama, TIDAK mengubah kode aktif Anda.
 *
 * Keunggulan file ini:
 *  - Mengirim email via API khusus (Resend / Brevo) yang lebih cepat (< 1 detik).
 *  - Tidak terikat kuota harian Gmail (100/hari).
 *  - Mengurangi risiko email OTP masuk ke folder spam.
 *  - Bisa beralih antara 'RESEND', 'BREVO', atau 'GMAIL' hanya dengan mengganti variabel PROVIDER.
 *
 * Cara Pemakaian (Saat Anda Siap Mencoba):
 *  1. Daftar akun di https://resend.com atau https://brevo.com (gratis).
 *  2. Dapatkan API Key:
 *     - Resend: API Keys > Create API Key (berawalan "re_...")
 *     - Brevo: Settings > SMTP & API > API Keys (berawalan "xkeysib-...")
 *  3. Buka script.google.com (buat project baru atau uji di tab baru).
 *  4. Simpan API Key di Project Settings > Script Properties (nama: RESEND_API_KEY atau BREVO_API_KEY).
 *  5. Terapkan (Deploy) sebagai Aplikasi Web (Web App), lalu salin URL /exec baru ke .env saat ingin beralih.
 */

// ====================== PENGATURAN LAYANAN ======================
// Pilihan: 'RESEND' | 'BREVO' | 'GMAIL'
var PROVIDER = 'RESEND';

// API Keys: WAJIB simpan di Project Settings > Script Properties dengan nama
// 'RESEND_API_KEY' atau 'BREVO_API_KEY' (jangan tulis API key langsung di kode!).
function getScriptSecret_(keyName) {
  var value = PropertiesService.getScriptProperties().getProperty(keyName);
  return String(value || '').trim();
}

// Pengirim (Sender):
// Untuk Resend: gunakan 'onboarding@resend.dev' untuk uji coba awal, atau 'no-reply@domain-anda.com' jika sudah verifikasi domain.
// Untuk Brevo: gunakan email yang Anda daftarkan sebagai Sender di dashboard Brevo.
var SENDER_EMAIL = 'onboarding@resend.dev';
var SENDER_NAME  = 'Panitia PERMIRA 2026';

// Verifikasi DPT (wajib salah satu: FIREBASE_PROJECT_ID atau DPT_SPREADSHEET_ID)
var FIREBASE_PROJECT_ID  = 'permira-ui'; // verifikasi DPT langsung via Firestore REST API + idToken
var DPT_SPREADSHEET_ID   = '';           // opsional: ID Google Sheet berisi tab DPT
var DPT_SHEET_NAME       = 'DPT';
var ALLOWED_EMAIL_DOMAIN = '';           // opsional, mis. 'ui.ac.id'

// Pengaturan OTP
var OTP_TTL_SECONDS = 180;       // Masa berlaku OTP (harus sama dengan src/config.js)
var RESEND_COOLDOWN_SECONDS = 25; // Jeda kirim ulang
var MAX_ATTEMPTS = 5;
var MAX_SENDS_PER_WINDOW = 5;    // Batas kirim OTP per NPM dalam 6 jam
var SEND_WINDOW_SECONDS = 21600; // 6 jam (batas maksimum CacheService GAS)
// ================================================================

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var npm = sanitizeNpm_(body.npm);
    if (!npm) return json_(false, 'NPM tidak valid.');

    if (body.action === 'send') return sendOtp_(npm, body);
    if (body.action === 'verify') return verifyOtp_(npm, body);
    return json_(false, 'Aksi tidak dikenali.');
  } catch (err) {
    console.error(err);
    return json_(false, 'Terjadi kesalahan pada server: ' + err.message);
  }
}

function doGet() {
  return json_(true, 'PERMIRA 2026 OTP Service (API Mode: ' + PROVIDER + ') aktif.');
}

// ------------------------- KIRIM OTP -------------------------
function sendOtp_(npm, body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var cache = CacheService.getScriptCache();

    if (cache.get('cd_' + npm)) {
      return json_(false, 'Mohon tunggu beberapa detik sebelum meminta kode baru.');
    }

    var sendCountRaw = cache.get('sc_' + npm);
    var sendCount = sendCountRaw ? Number(sendCountRaw) : 0;
    if (sendCount >= MAX_SENDS_PER_WINDOW) {
      return json_(false, 'Batas permintaan kode OTP untuk NPM ini tercapai. Hubungi Panitia.');
    }

    var resolved = resolveVoter_(npm, body.idToken);
    if (!resolved.ok) {
      return json_(false, resolved.message);
    }

    var otp = generateOtp_();
    var salt = Utilities.getUuid();
    var record = {
      hash: hash_(otp, npm, salt),
      salt: salt,
      attempts: 0,
      exp: Date.now() + OTP_TTL_SECONDS * 1000
    };

    cache.put('otp_' + npm, JSON.stringify(record), OTP_TTL_SECONDS);
    cache.put('cd_' + npm, '1', RESEND_COOLDOWN_SECONDS);
    cache.put('sc_' + npm, String(sendCount + 1), SEND_WINDOW_SECONDS);

    var nama = String(resolved.nama || 'Mahasiswa').replace(/[<>&"']/g, '').substring(0, 100);
    var htmlContent = buildHtml_(nama, otp);
    var subject = 'Kode OTP PERMIRA 2026';

    // Kirim sesuai penyedia yang dipilih
    if (PROVIDER === 'RESEND') {
      sendViaResend_(resolved.email, subject, htmlContent);
    } else if (PROVIDER === 'BREVO') {
      sendViaBrevo_(resolved.email, nama, subject, htmlContent);
    } else {
      sendViaGmail_(resolved.email, nama, otp, subject, htmlContent);
    }

    return json_(true, 'Kode OTP telah dikirim ke ' + maskEmail_(resolved.email) + '.');
  } catch (sendError) {
    console.error('Error saat kirim email:', sendError);
    return json_(false, 'Gagal mengirim email OTP. Silakan coba lagi.');
  } finally {
    lock.releaseLock();
  }
}

// ----------------------- ADAPTER: RESEND ----------------------
function sendViaResend_(toEmail, subject, htmlContent) {
  var rawKey = getScriptSecret_('RESEND_API_KEY');
  if (!rawKey) {
    throw new Error('RESEND_API_KEY belum diset di Script Properties.');
  }
  var formattedKey = rawKey.startsWith('re_') ? rawKey : 're_' + rawKey;

  var url = 'https://api.resend.com/emails';
  var payload = {
    from: SENDER_NAME + ' <' + SENDER_EMAIL + '>',
    to: [toEmail],
    subject: subject,
    html: htmlContent
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + formattedKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var statusCode = response.getResponseCode();
  if (statusCode >= 300) {
    var errorJson = JSON.parse(response.getContentText() || '{}');
    throw new Error('Resend Error (' + statusCode + '): ' + (errorJson.message || response.getContentText()));
  }
}

// ----------------------- ADAPTER: BREVO -----------------------
function sendViaBrevo_(toEmail, toName, subject, htmlContent) {
  var brevoKey = getScriptSecret_('BREVO_API_KEY');
  if (!brevoKey) {
    throw new Error('BREVO_API_KEY belum diset di Script Properties.');
  }

  var url = 'https://api.brevo.com/v3/smtp/email';
  var payload = {
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    },
    to: [
      { email: toEmail, name: toName }
    ],
    subject: subject,
    htmlContent: htmlContent
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'api-key': brevoKey,
      'accept': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var statusCode = response.getResponseCode();
  if (statusCode >= 300) {
    var errorJson = JSON.parse(response.getContentText() || '{}');
    throw new Error('Brevo Error (' + statusCode + '): ' + (errorJson.message || response.getContentText()));
  }
}

// ------------------ ADAPTER FALLBACK: GMAIL ------------------
function sendViaGmail_(email, nama, otp, subject, htmlContent) {
  MailApp.sendEmail({
    to: email,
    subject: subject,
    name: SENDER_NAME,
    body: 'Halo ' + nama + ',\n\nKode OTP Anda: ' + otp + '\n\nBerlaku 3 menit (' + OTP_TTL_SECONDS +
      ' detik) dan hanya dapat dipakai sekali. Jangan bagikan kepada siapa pun.',
    htmlBody: htmlContent
  });
}

// ----------------------- VERIFIKASI OTP ----------------------
function verifyOtp_(npm, body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get('otp_' + npm);
    if (!raw) {
      return json_(false, 'Kode OTP sudah kedaluwarsa atau belum diminta. Silakan minta kode baru.');
    }

    var record;
    try {
      record = JSON.parse(raw);
    } catch (err) {
      return json_(false, 'Data sesi tidak valid. Silakan minta kode baru.');
    }

    if (Date.now() > record.exp) {
      cache.remove('otp_' + npm);
      return json_(false, 'Kode OTP sudah kedaluwarsa.');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      cache.remove('otp_' + npm);
      return json_(false, 'Terlalu banyak percobaan salah. Silakan minta kode baru.');
    }

    var inputOtp = String(body.otp || '').replace(/\D/g, '');
    if (inputOtp.length !== 6) {
      return json_(false, 'Kode OTP harus 6 digit.');
    }
    var expectedHash = hash_(inputOtp, npm, record.salt);

    if (!safeEqual_(expectedHash, record.hash)) {
      record.attempts += 1;
      if (record.attempts >= MAX_ATTEMPTS) {
        cache.remove('otp_' + npm);
        return json_(false, 'Terlalu banyak percobaan salah. Silakan minta kode baru.');
      }
      var remaining = MAX_ATTEMPTS - record.attempts;
      var ttlLeft = Math.max(1, Math.round((record.exp - Date.now()) / 1000));
      cache.put('otp_' + npm, JSON.stringify(record), ttlLeft);
      return json_(false, 'Kode OTP salah. Sisa percobaan: ' + remaining + '.');
    }

    // Berhasil — hapus agar OTP tidak dapat dipakai ulang
    cache.remove('otp_' + npm);
    return json_(true, 'Verifikasi OTP berhasil.');
  } finally {
    lock.releaseLock();
  }
}

// ----------------------- UTILITAS BANTU ----------------------
function sanitizeNpm_(npm) {
  var value = String(npm || '').trim();
  return /^[A-Za-z0-9]{5,20}$/.test(value) ? value : '';
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function resolveVoter_(npm, idToken) {
  var email = '';
  var nama = '';

  if (DPT_SPREADSHEET_ID) {
    var sheet = SpreadsheetApp.openById(DPT_SPREADSHEET_ID).getSheetByName(DPT_SHEET_NAME);
    if (!sheet) return { ok: false, message: 'Sheet DPT tidak ditemukan.' };
    var values = sheet.getDataRange().getValues();
    var header = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var npmCol = header.indexOf('npm');
    var emailCol = header.indexOf('email');
    var namaCol = header.indexOf('nama');
    if (npmCol < 0 || emailCol < 0) return { ok: false, message: 'Format header sheet DPT tidak valid.' };
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][npmCol]).trim() === npm) {
        email = String(values[i][emailCol]).trim().toLowerCase();
        nama = namaCol >= 0 ? String(values[i][namaCol] || '').trim() : '';
        break;
      }
    }
    if (!email) return { ok: false, message: 'NPM tidak terdaftar dalam DPT.' };
  } else if (FIREBASE_PROJECT_ID) {
    var token = String(idToken || '').trim();
    if (!token) return { ok: false, message: 'Sesi autentikasi tidak ditemukan. Silakan masuk ulang.' };

    var url = 'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(FIREBASE_PROJECT_ID) +
      '/databases/(default)/documents/dpt/' +
      encodeURIComponent(npm);
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    var status = res.getResponseCode();
    if (status === 401 || status === 403) {
      return { ok: false, message: 'Sesi autentikasi tidak valid atau berakhir. Silakan masuk ulang.' };
    }
    if (status === 404) {
      return { ok: false, message: 'NPM tidak terdaftar dalam DPT.' };
    }
    if (status < 200 || status >= 300) {
      return { ok: false, message: 'Gagal memverifikasi data pemilih di DPT.' };
    }

    var doc = JSON.parse(res.getContentText() || '{}');
    var fields = doc.fields || {};
    if (fields.hasVoted && fields.hasVoted.booleanValue === true) {
      return { ok: false, message: 'Hak suara untuk NPM ini sudah digunakan.' };
    }
    email = fields.email && fields.email.stringValue ? String(fields.email.stringValue).trim().toLowerCase() : '';
    nama = fields.nama && fields.nama.stringValue ? String(fields.nama.stringValue).trim() : '';
  } else {
    return { ok: false, message: 'Sumber verifikasi DPT belum dikonfigurasi.' };
  }

  if (!isValidEmail_(email)) return { ok: false, message: 'Email pemilih di DPT tidak valid.' };
  if (ALLOWED_EMAIL_DOMAIN && email.split('@')[1] !== ALLOWED_EMAIL_DOMAIN.toLowerCase()) {
    return { ok: false, message: 'Domain email pemilih tidak diizinkan.' };
  }
  return { ok: true, email: email, nama: nama || 'Mahasiswa' };
}

function generateOtp_() {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 6; i++) {
    n = (n * 256 + (bytes[i] & 0xff)) % 1000000;
  }
  return ('000000' + n).slice(-6);
}

function hash_(otp, npm, salt) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, otp + ':' + npm + ':' + salt);
  return digest.map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function maskEmail_(email) {
  var parts = email.split('@');
  if (parts.length !== 2) return email;
  var name = parts[0];
  var domain = parts[1];
  var maskedName = name.length <= 2 ? name[0] + '*' : name.slice(0, 2) + '***' + name.slice(-1);
  return maskedName + '@' + domain;
}

function json_(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildHtml_(nama, otp) {
  return '' +
    '<div style="font-family:Arial,sans-serif;background:#3D1203;padding:32px">' +
    '<div style="max-width:480px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.15)">' +
    '<div style="background:#BA3D03;color:#ffffff;padding:20px 24px;font-size:20px;font-weight:bold;letter-spacing:1px">' +
    'PERMIRA 2026' +
    '</div>' +
    '<div style="padding:28px 24px;color:#1F110B">' +
    '<p style="font-size:15px;margin:0 0 12px">Halo <b>' + nama + '</b>,</p>' +
    '<p style="font-size:14px;color:#4A3B32;margin:0 0 20px;line-height:1.5">' +
    'Berikut adalah kode One-Time Password (OTP) resmi Anda untuk memverifikasi bilik suara:' +
    '</p>' +
    '<div style="text-align:center;background:#FFF4E0;border:2px dashed #BA3D03;border-radius:12px;padding:18px 0;margin:20px 0">' +
    '<span style="font-size:38px;font-weight:bold;letter-spacing:10px;color:#3D1203;font-family:monospace">' + otp + '</span>' +
    '</div>' +
    '<p style="font-size:12px;color:#856B5D;line-height:1.5;margin:16px 0 0">' +
    '⚠️ Kode ini berlaku <b>3 menit (' + OTP_TTL_SECONDS + ' detik)</b> dan hanya dapat dipakai satu kali. ' +
    '<b>Jangan pernah membagikan kode ini kepada siapa pun</b>, termasuk pihak panitia.' +
    '</p>' +
    '</div>' +
    '<div style="background:#F7F4F0;padding:14px 24px;text-align:center;font-size:11px;color:#856B5D;border-top:1px solid #ECE7E1">' +
    'Panitia Pemilihan Raya Mahasiswa • Sistem E-Voting Resmi' +
    '</div>' +
    '</div>' +
    '</div>';
}
