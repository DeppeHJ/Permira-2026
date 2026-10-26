import { ANGKATAN as DEFAULT_ANGKATAN } from '../data'
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
export function normalizeAngkatan(raw, npm, angkatanList = DEFAULT_ANGKATAN) {
  const value = String(raw ?? '').trim().toLowerCase()

  if (value) {
    // 1. Direct match on key or label
    const direct = angkatanList.find(
      (a) => a.key.toLowerCase() === value || a.label.toLowerCase() === value,
    )
    if (direct) return direct.key

    // 2. Simplified slug comparison (stripping spaces, punctuation, "akt", "angkatan")
    const clean = (str) =>
      str.toLowerCase().replace(/akt(atan)?/g, '').replace(/[^a-z0-9]/g, '')
    const cleanValue = clean(value)
    const slugMatch = angkatanList.find(
      (a) => clean(a.key) === cleanValue || clean(a.label) === cleanValue,
    )
    if (slugMatch) return slugMatch.key

    // 3. Profesi
    if (/profesi|prof/.test(value)) {
      const prof = angkatanList.find(
        (a) => a.key.toLowerCase().includes('prof') || a.label.toLowerCase().includes('prof'),
      )
      if (prof) return prof.key
    }

    // 4. Extract degree & year (e.g. S1, S2, S3, RPL)
    let degree = ''
    if (/rpl/.test(value)) degree = 'rpl'
    else if (/s3|doktor|pasca/.test(value)) degree = 's3'
    else if (/s2|magister/.test(value)) degree = 's2'
    else if (/s1|sarjana/.test(value)) degree = 's1'

    const yrMatch = value.match(/(?:20)?(\d{2})/)
    const yy = yrMatch ? yrMatch[1] : null

    if (degree && yy) {
      const match = angkatanList.find(
        (a) =>
          a.key.toLowerCase() === `${degree}-${yy}` ||
          (a.label.toLowerCase().includes(degree) && a.label.toLowerCase().includes(yy)),
      )
      if (match) return match.key
    }

    // If degree not specified, but 2-digit year found (e.g. "2026", "26", "Angkatan 2024"):
    // Default to S1 in Permira
    if (yy) {
      const s1Match = angkatanList.find(
        (a) =>
          a.key.toLowerCase() === `s1-${yy}` ||
          a.key.toLowerCase() === `20${yy}` ||
          a.key.toLowerCase() === yy,
      )
      if (s1Match) return s1Match.key
    }

    // Fallback: any category whose key or label contains the year or raw text
    const fallback = angkatanList.find(
      (a) => (yy && (a.key.includes(yy) || a.label.includes(yy))) || a.key.toLowerCase() === value,
    )
    if (fallback) return fallback.key

    return null
  }

  // Kolom kosong: turunkan dari NPM
  const npmStr = String(npm ?? '')
  let prefix = ''
  if (/^20\d{2}/.test(npmStr)) {
    prefix = npmStr.slice(2, 4)
  } else if (/^\d{2}/.test(npmStr)) {
    prefix = npmStr.slice(0, 2)
  }

  if (prefix) {
    const s1Match = angkatanList.find(
      (a) =>
        a.key.toLowerCase() === `s1-${prefix}` ||
        a.key.toLowerCase() === `20${prefix}` ||
        a.label.toLowerCase().includes(prefix),
    )
    if (s1Match) return s1Match.key
  }
  return null
}

/**
 * Validasi isi CSV DPT. Mengembalikan { valid, invalid, fatal }.
 * - valid: [{ npm, nama, email, angkatan }]
 * - invalid: [{ line, reason }]
 * - fatal: pesan error tingkat berkas (header salah, terlalu besar, dll.)
 */
export function parseDptCsv(text, angkatanList = DEFAULT_ANGKATAN) {
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
    const angkatan = normalizeAngkatan(get('angkatan'), npm, angkatanList)
    if (!angkatan) {
      invalid.push({ line, reason: `Angkatan pada NPM ${npm} tidak dikenali.` })
      return
    }

    seen.add(npm)
    valid.push({ npm, nama, email, angkatan })
  })

  return { valid, invalid, fatal: null }
}
