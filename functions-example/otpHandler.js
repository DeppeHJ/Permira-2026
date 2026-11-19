/**
 * Contoh Implementasi Backend Mandiri (Node.js / Express / Firebase Cloud Functions)
 * Menggunakan Resend API untuk pengiriman OTP berkecepatan tinggi.
 *
 * File ini hanyalah CONTOH ARSITEKTUR dan TIDAK mempengaruhi aplikasi aktif Anda.
 */

import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import { Resend } from 'resend'

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())

const resend = new Resend(process.env.RESEND_API_KEY || 're_YOUR_KEY')

// Penyimpanan sementara (Dalam produksi gunakan Firestore atau Redis dengan TTL)
const otpStore = new Map()
const OTP_TTL_MS = 90 * 1000

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

function hashOtp(otp, npm, salt) {
  return crypto.createHash('sha256').update(`${otp}:${npm}:${salt}`).digest('hex')
}

// 1. Endpoint Kirim OTP (POST /api/otp/send)
app.post('/api/otp/send', async (req, res) => {
  try {
    const { npm, nama, email } = req.body
    if (!npm || !email) {
      return res.status(400).json({ success: false, message: 'NPM dan Email wajib diisi.' })
    }

    const otp = generateOtp()
    const salt = crypto.randomUUID()
    const hashed = hashOtp(otp, npm, salt)

    otpStore.set(npm, {
      hash: hashed,
      salt,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    })

    // Kirim via Resend API (< 1 detik)
    const { error } = await resend.emails.send({
      from: 'Panitia PERMIRA <onboarding@resend.dev>',
      to: [email],
      subject: 'Kode OTP PERMIRA 2026',
      html: `
        <div style="font-family: sans-serif; background: #3D1203; padding: 24px;">
          <div style="background: white; border-radius: 12px; padding: 24px; max-width: 440px; margin: auto;">
            <h2 style="color: #BA3D03; margin-top: 0;">PERMIRA 2026</h2>
            <p>Halo <b>${nama || 'Mahasiswa'}</b>,</p>
            <p>Gunakan kode OTP berikut untuk memverifikasi suara Anda:</p>
            <div style="text-align: center; background: #FFF4E0; padding: 14px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3D1203;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #777; margin-top: 16px;">
              Kode berlaku 90 detik dan hanya dapat digunakan 1 kali.
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Resend Error:', error)
      return res.status(500).json({ success: false, message: 'Gagal mengirim email OTP.' })
    }

    return res.json({ success: true, message: 'Kode OTP telah dikirim.' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' })
  }
})

// 2. Endpoint Verifikasi OTP (POST /api/otp/verify)
app.post('/api/otp/verify', (req, res) => {
  const { npm, otp } = req.body
  const record = otpStore.get(npm)

  if (!record || Date.now() > record.expiresAt) {
    otpStore.delete(npm)
    return res.status(400).json({ success: false, message: 'Kode OTP sudah kedaluwarsa.' })
  }

  if (record.attempts >= 5) {
    otpStore.delete(npm)
    return res.status(400).json({ success: false, message: 'Terlalu banyak percobaan salah.' })
  }

  const checkHash = hashOtp(String(otp).trim(), npm, record.salt)
  if (checkHash !== record.hash) {
    record.attempts += 1
    return res.status(400).json({ success: false, message: 'Kode OTP salah.' })
  }

  // Sukses verifikasi, hapus agar one-time use
  otpStore.delete(npm)
  return res.json({ success: true, message: 'Verifikasi berhasil.' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`OTP Service berjalan di http://localhost:${PORT}`)
})
