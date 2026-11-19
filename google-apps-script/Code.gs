/**
 * PERMIRA 2026 — Pengirim & Verifikator OTP (Google Apps Script Web App)
 *
 * Pemasangan:
 *  1. script.google.com > Proyek baru > tempel kode ini di Code.gs.
 *  2. Pastikan FIREBASE_PROJECT_ID sesuai proyek Firebase Anda (default: 'permira-ui')
 *     agar email tujuan OTP diverifikasi langsung dari koleksi `dpt` di Firestore via idToken.
 *     (Atau isi DPT_SPREADSHEET_ID jika ingin mencocokkan lewat Google Sheet "DPT").
 *  3. Terapkan > Deployment baru > Jenis: Aplikasi web
 *       - Jalankan sebagai: Saya (pemilik)
 *       - Yang memiliki akses: Siapa saja
 *  4. Salin URL /exec ke VITE_OTP_SCRIPT_URL pada file .env aplikasi.
 *  5. Setiap mengubah kode, buat deployment versi baru.
 *
 * Protokol (POST, Content-Type: text/plain;charset=utf-8, body JSON):
 *  - { action: 'send',   npm, idToken } -> { success, message }
 *  - { action: 'verify', npm, otp }     -> { success, message }
 *
 * Keamanan:
 *  - Kode OTP dibuat di server, TIDAK pernah dikembalikan ke browser.
 *  - Hanya hash SHA-256 (+ garam) yang disimpan di CacheService, kedaluwarsa otomatis.
 *  - Maksimal 5 kali salah per kode, jeda kirim ulang, dan satu kali pakai.
 *
 * Kuota email (MailApp): sekitar 100/hari untuk akun Gmail biasa dan 1.500/hari
 * untuk Google Workspace. Pastikan sesuai jumlah pemilih (800–1.000) dan
 * perkirakan kirim ulang.
 */

// ====================== KONFIGURASI ======================
var OTP_TTL_SECONDS = 180;       // harus sama dengan OTP_TTL_SECONDS di src/config.js
var RESEND_COOLDOWN_SECONDS = 25; // sedikit lebih kecil dari jeda di klien (30 dtk)
var MAX_ATTEMPTS = 5;
var MAX_SENDS_PER_WINDOW = 5;    // maksimal kirim OTP per NPM dalam 6 jam
var SEND_WINDOW_SECONDS = 21600; // 6 jam (batas maksimum CacheService GAS)
var SENDER_NAME = 'Panitia PERMIRA 2026';
var FIREBASE_PROJECT_ID = 'permira-ui'; // verifikasi DPT langsung via Firestore REST API + idToken
var DPT_SPREADSHEET_ID = '';      // opsional: jika diisi, verifikasi dari Google Sheet "DPT"
var DPT_SHEET_NAME = 'DPT';
var ALLOWED_EMAIL_DOMAIN = '';    // opsional, mis. 'kampus.ac.id' (kosongkan untuk semua domain)
// =========================================================

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
    return json_(false, 'Terjadi kesalahan pada server.');
  }
}

// Mengecek bahwa Web App aktif (buka URL /exec di browser).
function doGet() {
  return json_(true, 'PERMIRA 2026 OTP service aktif.');
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
    if (!resolved.ok) return json_(false, resolved.message);

    var otp = generateOtp_();
    var salt = Utilities.getUuid();
    var record = { hash: hash_(otp, npm, salt), salt: salt, attempts: 0, exp: Date.now() + OTP_TTL_SECONDS * 1000 };

    cache.put('otp_' + npm, JSON.stringify(record), OTP_TTL_SECONDS);
    cache.put('cd_' + npm, '1', RESEND_COOLDOWN_SECONDS);
    cache.put('sc_' + npm, String(sendCount + 1), SEND_WINDOW_SECONDS);

    var nama = String(resolved.nama || 'Mahasiswa').replace(/[<>&"']/g, '').substring(0, 100);
    MailApp.sendEmail({
      to: resolved.email,
      subject: 'Kode OTP PERMIRA 2026',
      name: SENDER_NAME,
      body: 'Halo ' + nama + ',\n\nKode OTP Anda: ' + otp + '\n\nBerlaku 3 menit (' + OTP_TTL_SECONDS +
        ' detik) dan hanya dapat dipakai sekali. Jangan bagikan kode ini kepada siapa pun, termasuk panitia.\n\n' +
        'Jika Anda tidak sedang memilih di PERMIRA 2026, abaikan email ini.',
      htmlBody: buildHtml_(nama, otp)
    });

    return json_(true, 'Kode OTP telah dikirim.');
  } finally {
    lock.releaseLock();
  }
}

// ----------------------- VERIFIKASI OTP ----------------------
function verifyOtp_(npm, body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var cache = CacheService.getScriptCache();
    var otp = String(body.otp || '').replace(/\D/g, '');
    if (otp.length !== 6) return json_(false, 'Kode OTP harus 6 digit.');

    var raw = cache.get('otp_' + npm);
    if (!raw) return json_(false, 'Kode OTP kedaluwarsa atau belum diminta. Kirim ulang kode.');

    var record = JSON.parse(raw);
    var remainingSeconds = Math.ceil((record.exp - Date.now()) / 1000);
    if (remainingSeconds <= 0) {
      cache.remove('otp_' + npm);
      return json_(false, 'Kode OTP kedaluwarsa. Kirim ulang kode.');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      cache.remove('otp_' + npm);
      return json_(false, 'Terlalu banyak percobaan salah. Minta kode OTP baru.');
    }

    if (!safeEqual_(hash_(otp, npm, record.salt), record.hash)) {
      record.attempts += 1;
      if (record.attempts >= MAX_ATTEMPTS) {
        cache.remove('otp_' + npm);
        return json_(false, 'Terlalu banyak percobaan salah. Minta kode OTP baru.');
      }
      cache.put('otp_' + npm, JSON.stringify(record), Math.max(1, remainingSeconds)); // TTL tidak diperpanjang
      return json_(false, 'Kode OTP salah. Sisa percobaan: ' + (MAX_ATTEMPTS - record.attempts) + '.');
    }

    cache.remove('otp_' + npm); // sekali pakai
    return json_(true, 'Verifikasi berhasil.');
  } finally {
    lock.releaseLock();
  }
}

// ------------------------- Utilitas --------------------------
function sanitizeNpm_(npm) {
  var value = String(npm || '').trim();
  return /^[A-Za-z0-9]{5,20}$/.test(value) ? value : '';
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Tentukan email & nama tujuan langsung dari DPT (Google Sheet atau Firestore REST API).
 * TIDAK pernah mempercayai email dari klien sehingga OTP tidak dapat dialihkan.
 */
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

function json_(success, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildHtml_(nama, otp) {
  return '' +
    '<div style="font-family:Arial,sans-serif;background:#3D1203;padding:32px">' +
    '<div style="max-width:480px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden">' +
    '<div style="background:#BA3D03;color:#ffffff;padding:20px 24px;font-size:20px;font-weight:bold">PERMIRA 2026</div>' +
    '<div style="padding:24px;color:#1F110B">' +
    '<p>Halo <b>' + nama + '</b>,</p>' +
    '<p>Gunakan kode berikut untuk memverifikasi suara Anda:</p>' +
    '<p style="text-align:center;font-size:36px;font-weight:bold;letter-spacing:10px;background:#E8C580;color:#2A0B02;border-radius:12px;padding:16px">' + otp + '</p>' +
    '<p style="font-size:13px;color:#66554E">Berlaku 3 menit (' + OTP_TTL_SECONDS + ' detik) dan hanya dapat dipakai sekali. ' +
    'Jangan bagikan kode ini kepada siapa pun, termasuk panitia.</p>' +
    '</div></div></div>';
}
