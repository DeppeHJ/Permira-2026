/**
 * Konfigurasi aplikasi. Semua nilai sensitif/lingkungan dibaca dari file .env
 * (lihat .env.example).
 */
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** URL Web App Google Apps Script untuk kirim & verifikasi OTP. */
export const OTP_SCRIPT_URL = import.meta.env.VITE_OTP_SCRIPT_URL || ''

/** Daftar email Admin KPU yang diizinkan (huruf kecil). */
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

/** Masa berlaku kode OTP (detik) — harus sama dengan OTP_TTL_SECONDS di Code.gs. */
export const OTP_TTL_SECONDS = 90

/** Jeda minimum sebelum OTP dapat dikirim ulang (detik). */
export const OTP_RESEND_SECONDS = 30

/** Batas operasi per writeBatch (limit Firestore 500, dipakai 450 agar aman). */
export const BATCH_CHUNK_SIZE = 450

/** Batas ukuran file CSV (byte) dan jumlah baris DPT sekali unggah. */
export const CSV_MAX_BYTES = 2 * 1024 * 1024
export const CSV_MAX_ROWS = 5000
