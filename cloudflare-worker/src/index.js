import { DurableObject } from 'cloudflare:workers'

const NPM_REGEX = /^[A-Za-z0-9]{5,20}$/
const OTP_REGEX = /^\d{6}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const OTP_TTL_SECONDS = 180
const RESEND_COOLDOWN_MS = 25 * 1000
const MAX_ATTEMPTS = 5
const SEND_WINDOW_MS = 6 * 60 * 60 * 1000
const MAX_SENDS_PER_WINDOW = 5

function isAllowedOrigin(origin, env) {
  if (!origin) return false
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',')
      .map((s) => s.trim())
      .includes(origin)
  }
  return (
    origin === 'https://pemira-fikui.my.id' ||
    origin === 'https://www.pemira-fikui.my.id' ||
    origin === 'https://permira-ui.web.app' ||
    origin === 'https://permira-ui.firebaseapp.com' ||
    /^https:\/\/permira-ui--[a-z0-9-]+\.web\.app$/i.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  )
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = isAllowedOrigin(origin, env) ? origin : 'https://pemira-fikui.my.id'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function jsonResponse(request, env, status, success, message) {
  return new Response(JSON.stringify({ success, message }), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      ...corsHeaders(request, env),
    },
  })
}

function generateOtp() {
  const limit = 1000000
  const maxValid = Math.floor(0xffffffff / limit) * limit
  const buf = new Uint32Array(1)
  let val
  do {
    crypto.getRandomValues(buf)
    val = buf[0]
  } while (val >= maxValid)
  return String(val % limit).padStart(6, '0')
}

async function hashOtp(otp, npm, salt) {
  const data = new TextEncoder().encode(`${otp}:${npm}:${salt}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function sanitizeDisplayName(raw) {
  return String(raw || 'Mahasiswa')
    .replace(/[<>&"']/g, '')
    .trim()
    .slice(0, 100) || 'Mahasiswa'
}

function buildHtml(nama, otp) {
  return `
    <div style="font-family: Arial, sans-serif; background: #3D1203; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <div style="background: #BA3D03; color: #ffffff; padding: 20px 24px; font-size: 20px; font-weight: bold; letter-spacing: 1px;">
          PERMIRA 2026
        </div>
        <div style="padding: 28px 24px; color: #1F110B;">
          <p style="font-size: 15px; margin: 0 0 12px;">Halo <b>${nama}</b>,</p>
          <p style="font-size: 14px; color: #4A3B32; margin: 0 0 20px; line-height: 1.5;">
            Berikut adalah kode One-Time Password (OTP) resmi Anda untuk memverifikasi bilik suara:
          </p>
          <div style="text-align: center; background: #FFF4E0; border: 2px dashed #BA3D03; border-radius: 12px; padding: 18px 0; margin: 20px 0;">
            <span style="font-size: 38px; font-weight: bold; letter-spacing: 10px; color: #3D1203; font-family: monospace;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #856B5D; line-height: 1.5; margin: 16px 0 0;">
            Kode ini berlaku <b>3 menit (${OTP_TTL_SECONDS} detik)</b> dan hanya dapat dipakai satu kali.
            <b>Jangan pernah membagikan kode ini kepada siapa pun</b>, termasuk pihak panitia.
          </p>
        </div>
        <div style="background: #F7F4F0; padding: 14px 24px; text-align: center; font-size: 11px; color: #856B5D; border-top: 1px solid #ECE7E1;">
          Panitia Pemilihan Raya Mahasiswa • Sistem E-Voting Resmi
        </div>
      </div>
    </div>
  `
}

async function resolveVoterFromDpt(npm, idToken, env) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim()
  if (!projectId) {
    return { ok: false, status: 500, message: 'FIREBASE_PROJECT_ID belum dikonfigurasi.' }
  }

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/dpt/${encodeURIComponent(npm)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })

  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, message: 'Sesi autentikasi tidak valid atau berakhir. Silakan masuk ulang.' }
  }
  if (res.status === 404) {
    return { ok: false, status: 404, message: 'NPM tidak terdaftar dalam DPT.' }
  }
  if (!res.ok) {
    return { ok: false, status: 502, message: 'Gagal memverifikasi data pemilih di DPT.' }
  }

  const doc = await res.json()
  const fields = doc.fields || {}
  if (fields.hasVoted?.booleanValue === true) {
    return { ok: false, status: 409, message: 'Hak suara untuk NPM ini sudah digunakan.' }
  }

  const email = String(fields.email?.stringValue || '').trim().toLowerCase()
  const nama = sanitizeDisplayName(fields.nama?.stringValue)

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, status: 400, message: 'Email pemilih di DPT tidak valid.' }
  }

  const allowedDomain = String(env.ALLOWED_EMAIL_DOMAIN || '').trim().toLowerCase()
  if (allowedDomain && email.split('@')[1] !== allowedDomain) {
    return { ok: false, status: 403, message: 'Domain email pemilih tidak diizinkan.' }
  }

  return { ok: true, email, nama }
}

async function sendViaZoho({ toEmail, toName, otp, env }) {
  const rawKey = String(env.ZOHO_API_KEY || '').trim()
  if (!rawKey) {
    throw new Error('ZOHO_API_KEY belum diset di secret Cloudflare Worker.')
  }

  const authHeader = /^Zoho-enczapikey\s+/i.test(rawKey) ? rawKey : `Zoho-enczapikey ${rawKey}`
  const endpoint = String(env.ZOHO_API_URL || 'https://cpaas.zoho.com/v1.1/email').trim()
  const senderEmail = String(env.SENDER_EMAIL || 'noreply@pemira-fikui.my.id').trim()
  const senderName = String(env.SENDER_NAME || 'Panitia PERMIRA 2026').trim()

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      from: {
        address: senderEmail,
        name: senderName,
      },
      to: [
        {
          email_address: {
            address: toEmail,
            name: toName,
          },
        },
      ],
      subject: 'Kode OTP PERMIRA 2026',
      htmlbody: buildHtml(toName, otp),
    }),
  })

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '')
    console.error('Zoho CPaaS error:', res.status, bodyText)
    throw new Error(`Zoho CPaaS HTTP ${res.status}`)
  }
}

/**
 * Durable Object per NPM: menjamin eksekusi berurutan (anti race-condition)
 * untuk cooldown kirim ulang, batas percobaan salah, dan sekali pakai (one-time use).
 */
export class OtpSession extends DurableObject {
  async prepareSend({ hash, salt }) {
    const now = Date.now()
    const current = (await this.ctx.storage.get('session')) || {}

    if (current.cooldownUntil && now < current.cooldownUntil) {
      return {
        ok: false,
        status: 429,
        message: 'Mohon tunggu beberapa detik sebelum meminta kode baru.',
      }
    }

    let sendCount = 1
    let sendWindowStart = now
    if (current.sendWindowStart && now - current.sendWindowStart < SEND_WINDOW_MS) {
      const prevCount = Number(current.sendCount) || 0
      if (prevCount >= MAX_SENDS_PER_WINDOW) {
        return {
          ok: false,
          status: 429,
          message: 'Batas permintaan kode OTP untuk NPM ini tercapai. Hubungi Panitia.',
        }
      }
      sendCount = prevCount + 1
      sendWindowStart = current.sendWindowStart
    }

    await this.ctx.storage.put('session', {
      hash,
      salt,
      attempts: 0,
      expiresAt: now + OTP_TTL_SECONDS * 1000,
      cooldownUntil: now + RESEND_COOLDOWN_MS,
      sendCount,
      sendWindowStart,
    })
    await this.ctx.storage.setAlarm(now + SEND_WINDOW_MS)

    return { ok: true }
  }

  async rollbackSend(salt) {
    const current = await this.ctx.storage.get('session')
    if (!current || current.salt !== salt) return
    await this.ctx.storage.put('session', {
      sendCount: Math.max(0, (Number(current.sendCount) || 1) - 1),
      sendWindowStart: current.sendWindowStart || Date.now(),
    })
  }

  async verifyOtp({ npm, inputOtp }) {
    const current = await this.ctx.storage.get('session')
    if (!current || !current.hash) {
      return {
        ok: false,
        status: 400,
        message: 'Kode OTP sudah kedaluwarsa atau belum diminta. Silakan minta kode baru.',
      }
    }

    if (Date.now() > current.expiresAt) {
      await this.ctx.storage.put('session', {
        sendCount: current.sendCount || 0,
        sendWindowStart: current.sendWindowStart || Date.now(),
      })
      return { ok: false, status: 400, message: 'Kode OTP sudah kedaluwarsa. Kirim ulang kode.' }
    }

    if ((current.attempts || 0) >= MAX_ATTEMPTS) {
      await this.ctx.storage.put('session', {
        sendCount: current.sendCount || 0,
        sendWindowStart: current.sendWindowStart || Date.now(),
      })
      return { ok: false, status: 400, message: 'Terlalu banyak percobaan salah. Minta kode OTP baru.' }
    }

    const inputHash = await hashOtp(inputOtp, npm, current.salt)
    if (!safeEqual(inputHash, current.hash)) {
      const nextAttempts = (current.attempts || 0) + 1
      if (nextAttempts >= MAX_ATTEMPTS) {
        await this.ctx.storage.put('session', {
          sendCount: current.sendCount || 0,
          sendWindowStart: current.sendWindowStart || Date.now(),
        })
        return { ok: false, status: 400, message: 'Terlalu banyak percobaan salah. Minta kode OTP baru.' }
      }
      await this.ctx.storage.put('session', { ...current, attempts: nextAttempts })
      return {
        ok: false,
        status: 400,
        message: `Kode OTP salah. Sisa percobaan: ${MAX_ATTEMPTS - nextAttempts}.`,
      }
    }

    // Sukses verifikasi: hapus hash agar one-time use, tetap simpan counter 6 jam
    await this.ctx.storage.put('session', {
      sendCount: current.sendCount || 0,
      sendWindowStart: current.sendWindowStart || Date.now(),
    })
    return { ok: true, status: 200, message: 'Verifikasi berhasil.' }
  }

  async alarm() {
    await this.ctx.storage.deleteAll()
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    if (request.method === 'GET') {
      return jsonResponse(request, env, 200, true, 'PERMIRA 2026 OTP service aktif (Cloudflare + Zoho CPaaS).')
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, env, 405, false, 'Metode HTTP tidak diizinkan.')
    }

    let body
    try {
      body = await request.json()
    } catch {
      return jsonResponse(request, env, 400, false, 'Payload JSON tidak valid.')
    }

    const action = body?.action
    const npm = String(body?.npm || '').trim()
    const idToken = String(body?.idToken || '').trim()

    if (!NPM_REGEX.test(npm)) {
      return jsonResponse(request, env, 400, false, 'NPM tidak valid.')
    }
    if (!idToken) {
      return jsonResponse(request, env, 401, false, 'Sesi autentikasi tidak ditemukan. Silakan masuk ulang.')
    }

    const stub = env.OTP_SESSIONS.get(env.OTP_SESSIONS.idFromName(npm))

    if (action === 'send') {
      const voter = await resolveVoterFromDpt(npm, idToken, env)
      if (!voter.ok) {
        return jsonResponse(request, env, voter.status, false, voter.message)
      }

      const otp = generateOtp()
      const salt = crypto.randomUUID()
      const hash = await hashOtp(otp, npm, salt)

      const gate = await stub.prepareSend({ hash, salt })
      if (!gate.ok) {
        return jsonResponse(request, env, gate.status, false, gate.message)
      }

      try {
        await sendViaZoho({ toEmail: voter.email, toName: voter.nama, otp, env })
      } catch (err) {
        console.error('Gagal kirim OTP:', err)
        await stub.rollbackSend(salt)
        return jsonResponse(request, env, 502, false, 'Gagal mengirim email OTP. Silakan coba lagi atau hubungi Panitia.')
      }

      return jsonResponse(request, env, 200, true, 'Kode OTP telah dikirim.')
    }

    if (action === 'verify') {
      const inputOtp = String(body?.otp || '').replace(/\D/g, '')
      if (!OTP_REGEX.test(inputOtp)) {
        return jsonResponse(request, env, 400, false, 'Kode OTP harus 6 digit.')
      }

      const result = await stub.verifyOtp({ npm, inputOtp })
      return jsonResponse(request, env, result.status, result.ok, result.message)
    }

    return jsonResponse(request, env, 400, false, 'Aksi tidak dikenali.')
  },
}
