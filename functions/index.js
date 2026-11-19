/**
 * Firebase Cloud Functions untuk Pengiriman & Verifikasi OTP PERMIRA 2026
 * Terintegrasi langsung dengan Resend API (< 1 detik).
 */

import { onRequest } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import cors from 'cors'
import crypto from 'crypto'

initializeApp()
const db = getFirestore()
const auth = getAuth()
const corsHandler = cors({ origin: true })

function getResendClient() {
  const rawKey = (process.env.RESEND_API_KEY || '').trim()
  if (!rawKey) return null
  return new Resend(rawKey.startsWith('re_') ? rawKey : `re_${rawKey}`)
}

const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev'
const SENDER_NAME = process.env.RESEND_SENDER_NAME || 'Panitia PERMIRA 2026'

const NPM_REGEX = /^[A-Za-z0-9]{5,20}$/
const OTP_REGEX = /^\d{6}$/
const OTP_TTL_SECONDS = 180
const RESEND_COOLDOWN_MS = 25 * 1000
const MAX_ATTEMPTS = 5
const SEND_WINDOW_MS = 6 * 60 * 60 * 1000
const MAX_SENDS_PER_WINDOW = 5

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000))
}

function hashOtp(otp, npm, salt) {
  return crypto.createHash('sha256').update(`${otp}:${npm}:${salt}`).digest('hex')
}

function safeCompare(a, b) {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function buildHtml(nama, otp) {
  return `
    <div style="font-family: Arial, sans-serif; background: #3D1203; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <div style="background: #BA3D03; color: #ffffff; padding: 20px 24px; font-size: 20px; font-weight: bold; letter-spacing: 1px;">
          PERMIRA 2026
        </div>
        <div style="padding: 28px 24px; color: #1F110B;">
          <p style="font-size: 15px; margin: 0 0 12px;">Halo <b>${nama || 'Mahasiswa'}</b>,</p>
          <p style="font-size: 14px; color: #4A3B32; margin: 0 0 20px; line-height: 1.5;">
            Berikut adalah kode One-Time Password (OTP) resmi Anda untuk memverifikasi bilik suara:
          </p>
          <div style="text-align: center; background: #FFF4E0; border: 2px dashed #BA3D03; border-radius: 12px; padding: 18px 0; margin: 20px 0;">
            <span style="font-size: 38px; font-weight: bold; letter-spacing: 10px; color: #3D1203; font-family: monospace;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #856B5D; line-height: 1.5; margin: 16px 0 0;">
            ⚠️ Kode ini berlaku <b>3 menit (${OTP_TTL_SECONDS} detik)</b> dan hanya dapat dipakai satu kali. 
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

/**
 * Cloud Function HTTP Endpoint: /otp
 * Menerima payload:
 *  - Kirim OTP:      { action: 'send', npm, nama, email }
 *  - Verifikasi OTP: { action: 'verify', npm, otp }
 */
export const otp = onRequest({ region: 'asia-southeast2', maxInstances: 10 }, (req, res) => {
  return corsHandler(req, res, async () => {
    // Dukung health check GET
    if (req.method === 'GET') {
      return res.status(200).json({ success: true, message: 'PERMIRA Cloud Functions OTP service aktif (Resend).' })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Metode HTTP tidak diizinkan.' })
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const action = body.action
      const npm = String(body.npm || '').trim()
      const idToken = String(body.idToken || '').trim()

      if (!NPM_REGEX.test(npm)) {
        return res.status(400).json({ success: false, message: 'NPM tidak valid.' })
      }
      if (!idToken) {
        return res.status(401).json({ success: false, message: 'Sesi autentikasi tidak ditemukan.' })
      }

      try {
        await auth.verifyIdToken(idToken)
      } catch {
        return res.status(401).json({ success: false, message: 'Sesi autentikasi tidak valid atau berakhir.' })
      }

      const docRef = db.collection('_otp_sessions').doc(npm)

      // ==================== 1. AKSI KIRIM OTP ====================
      if (action === 'send') {
        const resend = getResendClient()
        if (!resend) {
          console.error('RESEND_API_KEY belum dikonfigurasi pada environment Cloud Functions.')
          return res.status(500).json({ success: false, message: 'Layanan pengiriman email OTP belum dikonfigurasi.' })
        }

        // Ambil email & nama langsung dari DPT di Firestore (jangan percaya input klien)
        const dptSnap = await db.collection('dpt').doc(npm).get()
        if (!dptSnap.exists) {
          return res.status(404).json({ success: false, message: 'Data pemilih tidak ditemukan di DPT.' })
        }
        const dpt = dptSnap.data() || {}
        if (dpt.hasVoted === true) {
          return res.status(409).json({ success: false, message: 'Hak suara untuk NPM ini sudah digunakan.' })
        }

        const email = String(dpt.email || '').trim().toLowerCase()
        const nama = String(dpt.nama || 'Mahasiswa').replace(/[<>&"']/g, '').substring(0, 100)
        if (!email || !email.includes('@')) {
          return res.status(400).json({ success: false, message: 'Email terdaftar di DPT tidak valid.' })
        }

        const otpCode = generateOtp()
        const salt = crypto.randomUUID()
        const hashed = hashOtp(otpCode, npm, salt)

        const sendGate = await db.runTransaction(async (tx) => {
          const now = Date.now()
          const existingDoc = await tx.get(docRef)
          let sendCount = 1
          let sendWindowStart = now

          if (existingDoc.exists) {
            const data = existingDoc.data() || {}
            if (data.cooldownUntil && now < data.cooldownUntil) {
              return { ok: false, status: 429, message: 'Mohon tunggu beberapa detik sebelum meminta kode baru.' }
            }
            if (data.sendWindowStart && now - data.sendWindowStart < SEND_WINDOW_MS) {
              const prevCount = Number(data.sendCount) || 0
              if (prevCount >= MAX_SENDS_PER_WINDOW) {
                return {
                  ok: false,
                  status: 429,
                  message: 'Batas permintaan kode OTP untuk NPM ini tercapai. Hubungi Panitia.',
                }
              }
              sendCount = prevCount + 1
              sendWindowStart = data.sendWindowStart
            }
          }

          tx.set(docRef, {
            hash: hashed,
            salt,
            email,
            attempts: 0,
            expiresAt: now + OTP_TTL_SECONDS * 1000,
            cooldownUntil: now + RESEND_COOLDOWN_MS,
            sendCount,
            sendWindowStart,
            updatedAt: FieldValue.serverTimestamp(),
          })
          return { ok: true }
        })

        if (!sendGate.ok) {
          return res.status(sendGate.status).json({ success: false, message: sendGate.message })
        }

        // Kirim email via Resend (jangan taruh OTP di subjek email)
        const { error } = await resend.emails.send({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to: [email],
          subject: 'Kode OTP PERMIRA 2026',
          html: buildHtml(nama, otpCode),
        })

        if (error) {
          console.error('Gagal mengirim via Resend:', error)
          return res.status(500).json({
            success: false,
            message: 'Gagal mengirim email OTP. Silakan coba lagi atau hubungi Panitia.',
          })
        }

        return res.status(200).json({ success: true, message: 'Kode OTP telah dikirim.' })
      }

      // ================== 2. AKSI VERIFIKASI OTP =================
      if (action === 'verify') {
        const inputOtp = String(body.otp || '').replace(/\D/g, '')
        if (!OTP_REGEX.test(inputOtp)) {
          return res.status(400).json({ success: false, message: 'Kode OTP harus 6 digit.' })
        }

        const outcome = await db.runTransaction(async (tx) => {
          const docSnap = await tx.get(docRef)
          if (!docSnap.exists) {
            return {
              ok: false,
              status: 400,
              message: 'Kode OTP sudah kedaluwarsa atau belum diminta. Silakan minta kode baru.',
            }
          }

          const data = docSnap.data() || {}
          if (Date.now() > data.expiresAt) {
            tx.delete(docRef)
            return { ok: false, status: 400, message: 'Kode OTP sudah kedaluwarsa.' }
          }

          if ((data.attempts || 0) >= MAX_ATTEMPTS) {
            tx.delete(docRef)
            return { ok: false, status: 400, message: 'Terlalu banyak percobaan salah. Silakan minta kode baru.' }
          }

          const inputHash = hashOtp(inputOtp, npm, data.salt)
          if (!safeCompare(inputHash, data.hash)) {
            const nextAttempts = (data.attempts || 0) + 1
            if (nextAttempts >= MAX_ATTEMPTS) {
              tx.delete(docRef)
              return { ok: false, status: 400, message: 'Terlalu banyak percobaan salah. Silakan minta kode baru.' }
            }
            tx.update(docRef, { attempts: nextAttempts })
            const sisa = MAX_ATTEMPTS - nextAttempts
            return { ok: false, status: 400, message: `Kode OTP salah. Sisa percobaan: ${sisa}.` }
          }

          // Verifikasi berhasil: Hapus sesi agar one-time use
          tx.delete(docRef)
          return { ok: true, status: 200, message: 'Verifikasi berhasil.' }
        })

        return res.status(outcome.status).json({ success: outcome.ok, message: outcome.message })
      }

      return res.status(400).json({ success: false, message: 'Aksi tidak dikenali.' })
    } catch (err) {
      console.error('Internal Server Error:', err)
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server OTP.' })
    }
  })
})
