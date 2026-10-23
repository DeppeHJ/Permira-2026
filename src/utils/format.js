/** Utilitas format & normalisasi teks. */

/** Rapikan spasi berlebih dan ubah ke huruf kecil untuk perbandingan. */
export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

/** Samarkan email: "mahasiswa@kampus.ac.id" -> "ma•••••@kampus.ac.id". */
export const maskEmail = (email) => {
  const [user = '', domain = ''] = String(email ?? '').split('@')
  if (!domain) return '•••••'
  const visible = user.slice(0, Math.min(2, user.length))
  return `${visible}${'•'.repeat(Math.max(3, user.length - visible.length))}@${domain}`
}

/** Ambil nama depan untuk sapaan. */
export const firstName = (fullName) => String(fullName ?? '').trim().split(/\s+/)[0] || 'Mahasiswa'

/** Format detik menjadi "m:ss". */
export const formatCountdown = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export const formatDateTime = (date) =>
  date
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '-'

export const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0)
