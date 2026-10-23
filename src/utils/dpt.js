import { ANGKATAN } from '../data'
import { CSV_MAX_ROWS } from '../config'
import { parseCsv } from './csv'

export const NPM_REGEX = /^[A-Za-z0-9]{5,20}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HEADER_ALIASES = {
  npm: ['npm', 'nim'],
  nama: ['nama', 'name', 'nama lengkap'],
  email: ['email', 'e-mail'],
  angkatan: ['angkatan', 'kategori', 'jenjang'],
}

/** Petakan nilai angkatan bebas menjadi salah satu key resmi, atau null jika tidak dikenali. */
export function normalizeAngkatan(raw, npm) {
  const value = String(raw ?? '').trim().toLowerCase()

  if (value) {
    const direct = ANGKATAN.find(
      (a) => a.key.toLowerCase() === value || a.label.toLowerCase() === value,
    )
    if (direct) return direct.key
    const year = value.match(/20\d{2}/)
    if (year && ANGKATAN.some((a) => a.key === year[0])) return year[0]
    if (/^(s2|magister)/.test(value)) return 'Magister'
    if (/^(s3|pasca|doktor)/.test(value)) return 'Pascasarjana'
    return null
  }

  // Kolom kosong: turunkan dari dua digit awal NPM (mis. 26xxxx -> 2026).
  const prefix = String(npm).slice(0, 2)
  if (/^\d{2}$/.test(prefix)) {
    const key = `20${prefix}`
    if (ANGKATAN.some((a) => a.key === key)) return key
  }
  return null
}

/**
 * Validasi isi CSV DPT. Mengembalikan { valid, invalid, fatal }.
 * - valid: [{ npm, nama, email, angkatan }]
 * - invalid: [{ line, reason }]
 * - fatal: pesan error tingkat berkas (header salah, terlalu besar, dll.)
 */
export function parseDptCsv(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) {
    return { valid: [], invalid: [], fatal: 'Berkas kosong atau tidak memiliki baris data.' }
  }
  if (rows.length - 1 > CSV_MAX_ROWS) {
    return { valid: [], invalid: [], fatal: `Maksimal ${CSV_MAX_ROWS} baris per unggahan.` }
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const index = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    index[field] = header.findIndex((h) => aliases.includes(h))
  }
  const missing = ['npm', 'nama', 'email'].filter((f) => index[f] === -1)
  if (missing.length > 0) {
    return {
      valid: [],
      invalid: [],
      fatal: `Kolom wajib tidak ditemukan: ${missing.join(', ')}. Gunakan header: npm, nama, email, angkatan.`,
    }
  }

  const valid = []
  const invalid = []
  const seen = new Set()

  rows.slice(1).forEach((cells, i) => {
    const line = i + 2
    const get = (field) => (index[field] === -1 ? '' : (cells[index[field]] ?? '').trim())

    const npm = get('npm')
    const nama = get('nama').replace(/\s+/g, ' ')
    const email = get('email').toLowerCase()

    if (!NPM_REGEX.test(npm)) {
      invalid.push({ line, reason: `NPM "${npm}" tidak valid (5–20 huruf/angka).` })
      return
    }
    if (seen.has(npm)) {
      invalid.push({ line, reason: `NPM ${npm} duplikat di dalam berkas.` })
      return
    }
    if (!nama || nama.length > 100) {
      invalid.push({ line, reason: `Nama pada NPM ${npm} kosong atau lebih dari 100 karakter.` })
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      invalid.push({ line, reason: `Email "${email}" pada NPM ${npm} tidak valid.` })
      return
    }
    const angkatan = normalizeAngkatan(get('angkatan'), npm)
    if (!angkatan) {
      invalid.push({ line, reason: `Angkatan pada NPM ${npm} tidak dikenali.` })
      return
    }

    seen.add(npm)
    valid.push({ npm, nama, email, angkatan })
  })

  return { valid, invalid, fatal: null }
}
