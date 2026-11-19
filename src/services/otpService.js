import { OTP_SCRIPT_URL } from '../config'
import { auth } from '../firebase'

const REQUEST_TIMEOUT_MS = 20000

/**
 * Panggil Google Apps Script (Web App) atau Cloud Function OTP.
 * Content-Type text/plain termasuk "simple request" sehingga tidak memicu preflight CORS.
 * Menyertakan Firebase `idToken` di body agar server dapat memverifikasi sesi & mengambil
 * email DPT langsung dari Firestore (tanpa mempercayai email dari browser).
 */
async function callScript(payload) {
  if (!OTP_SCRIPT_URL) {
    throw new Error('Layanan OTP belum dikonfigurasi. Hubungi Panitia.')
  }

  const user = auth?.currentUser
  if (!user) {
    throw new Error('Sesi pemilih tidak ditemukan. Silakan masuk kembali.')
  }
  const idToken = await user.getIdToken()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(OTP_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, idToken }),
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Permintaan ke layanan OTP melewati batas waktu. Coba lagi.', { cause: error })
    }
    throw new Error('Tidak dapat menghubungi layanan OTP. Periksa koneksi internet Anda.', { cause: error })
  } finally {
    clearTimeout(timer)
  }
}

/** Minta server mengirim OTP ke email pemilih. */
export async function sendOtp({ npm, nama, email }) {
  const result = await callScript({ action: 'send', npm, nama, email })
  if (!result?.success) throw new Error(result?.message || 'Gagal mengirim kode OTP.')
  return result
}

/** Verifikasi OTP di server. Resolve jika valid, reject jika salah/kedaluwarsa. */
export async function verifyOtp({ npm, otp }) {
  const result = await callScript({ action: 'verify', npm, otp })
  if (!result?.success) throw new Error(result?.message || 'Kode OTP tidak valid.')
  return result
}
