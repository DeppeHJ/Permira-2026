/**
 * Firebase Cloud Functions untuk Pengiriman & Verifikasi OTP PERMIRA 2026
 * Terintegrasi langsung dengan Resend API (< 1 detik).
 */

import { onRequest } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import cors from 'cors'
import crypto from 'crypto'

initializeApp()
const db = getFirestore()
const corsHandler = cors({ origin: true })

// Ambil Resend API Key dan pastikan format berawalan "re_"
const RAW_KEY = (process.env.RESEND_API_KEY || 'KmyJZOVHFEcYWE7FhFzEkqsh').trim()
const RESEND_API_KEY = RAW_KEY.startsWith('re_') ? RAW_KEY : `re_${RAW_KEY}`
const resend = new Resend(RESEND_API_KEY)

const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev'
const SENDER_NAME = process.env.RESEND_SENDER_NAME || 'Panitia PERMIRA 2026'

const OTP_TTL_SECONDS = 90
const RESEND_COOLDOWN_MS = 25 * 1000
const MAX_ATTEMPTS = 5

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
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
            ⚠️ Kode ini berlaku <b>${OTP_TTL_SECONDS} detik</b> dan hanya dapat dipakai satu kali. 
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
      const npm = String(body.npm || '').replace(/[^a-zA-Z0-9_-]/g, '').trim()

      if (!npm) {
        return res.status(400).json({ success: false, message: 'NPM tidak valid.' })
      }

      const docRef = db.collection('_otp_sessions').doc(npm)

      // ==================== 1. AKSI KIRIM OTP ====================
      if (action === 'send') {
        const email = String(body.email || '').trim().toLowerCase()
        const nama = String(body.nama || 'Mahasiswa').replace(/[<>&"']/g, '').substring(0, 100)

        if (!email || !email.includes('@')) {
          return res.status(400).json({ success: false, message: 'Email tidak valid.' })
        }

        // Cek cooldown kirim ulang
        const existingDoc = await docRef.get()
        if (existingDoc.exists) {
          const data = existingDoc.data()
          if (data.cooldownUntil && Date.now() < data.cooldownUntil) {
            return res.status(429).json({ success: false, message: 'Mohon tunggu beberapa detik sebelum meminta kode baru.' })
          }
        }

        const otpCode = generateOtp()
        const salt = crypto.randomUUID()
        const hashed = hashOtp(otpCode, npm, salt)

        // Simpan sesi ke Firestore
        await docRef.set({
          hash: hashed,
          salt: salt,
          email: email,
          attempts: 0,
          expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
          cooldownUntil: Date.now() + RESEND_COOLDOWN_MS,
          updatedAt: FieldValue.serverTimestamp(),
        })

        // Kirim email via Resend
        const { error } = await resend.emails.send({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to: [email],
          subject: `Kode OTP PERMIRA 2026: ${otpCode}`,
          html: buildHtml(nama, otpCode),
        })

        if (error) {
          console.error('Gagal mengirim via Resend:', error)
          return res.status(500).json({
            success: false,
            message: `Gagal mengirim email OTP: ${error.message || 'Periksa API Key atau email pengirim di Resend.'}`,
          })
        }

        return res.status(200).json({ success: true, message: 'Kode OTP telah dikirim.' })
      }

      // ================== 2. AKSI VERIFIKASI OTP =================
      if (action === 'verify') {
        const inputOtp = String(body.otp || '').trim()
        if (!inputOtp) {
          return res.status(400).json({ success: false, message: 'Kode OTP wajib diisi.' })
        }

        const docSnap = await docRef.get()
        if (!docSnap.exists) {
          return res.status(400).json({
            success: false,
            message: 'Kode OTP sudah kedaluwarsa atau belum diminta. Silakan minta kode baru.',
          })
        }

        const data = docSnap.data()

        // Cek kedaluwarsa
        if (Date.now() > data.expiresAt) {
          await docRef.delete()
          return res.status(400).json({ success: false, message: 'Kode OTP sudah kedaluwarsa.' })
        }

        // Cek batas percobaan
        if (data.attempts >= MAX_ATTEMPTS) {
          await docRef.delete()
          return res.status(400).json({ success: false, message: 'Terlalu banyak percobaan salah. Silakan minta kode baru.' })
        }

        // Cek kecocokan hash
        const inputHash = hashOtp(inputOtp, npm, data.salt)
        if (!safeCompare(inputHash, data.hash)) {
          const nextAttempts = (data.attempts || 0) + 1
          await docRef.update({ attempts: nextAttempts })
          const sisa = MAX_ATTEMPTS - nextAttempts
          return res.status(400).json({ success: false, message: `Kode OTP salah. Sisa percobaan: ${sisa}.` })
        }

        // Verifikasi berhasil: Hapus sesi agar one-time use
        await docRef.delete()
        return res.status(200).json({ success: true, message: 'Verifikasi berhasil.' })
      }

      return res.status(400).json({ success: false, message: 'Aksi tidak dikenali.' })
    } catch (err) {
      console.error('Internal Server Error:', err)
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server OTP.' })
    }
  })
})
