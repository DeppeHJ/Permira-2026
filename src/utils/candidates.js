/**
 * Utilitas data kandidat: normalisasi dokumen Firestore, serta konversi dua arah
 * antara dokumen kandidat dan model formulir editor Super Admin.
 */

export const CANDIDATE_TYPES = {
  ai: { label: 'Anggota Independen (AI)', role: 'Calon Anggota Independen', idPrefix: 'ai' },
  kabem: { label: 'Ketua & Wakil Ketua BEM', role: 'Calon Ketua & Wakil Ketua BEM', idPrefix: 'bem' },
}

const asString = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value))
const asList = (value) =>
  Array.isArray(value) ? value.map((item) => asString(item).trim()).filter(Boolean) : []

/** Pastikan semua field kandidat bertipe benar sebelum dipakai UI. */
export function normalizeCandidate(raw) {
  const number = asString(raw.number)
  const type = raw.type === 'kabem' ? 'kabem' : 'ai'
  return {
    ...raw,
    id: asString(raw.id),
    type,
    number,
    order: Number(raw.order) || Number(number) || 0,
    name: asString(raw.name),
    ketua: asString(raw.ketua),
    wakil: asString(raw.wakil),
    role: asString(raw.role) || CANDIDATE_TYPES[type].role,
    study: asString(raw.study),
    photo: asString(raw.photo),
    tagline: asString(raw.tagline),
    visi: asString(raw.visi),
    misi: asList(raw.misi),
    programs: type === 'kabem' ? asList(raw.programs) : [],
  }
}

export const sortCandidates = (list) =>
  [...list].sort((a, b) => a.order - b.order || a.number.localeCompare(b.number, 'id', { numeric: true }))

/** Pecah "Teknik Informatika, Angkatan 2023" atau "Teknik Industri 2023" menjadi jurusan & angkatan. */
export function splitStudy(text) {
  const value = asString(text).trim()
  const labelled = value.match(/^(.*?),?\s*Angkatan\s+(\S+)$/i)
  if (labelled) return { jurusan: labelled[1].trim(), angkatan: labelled[2].trim() }
  const trailingYear = value.match(/^(.*?)\s+(\d{4})$/)
  if (trailingYear) return { jurusan: trailingYear[1].trim(), angkatan: trailingYear[2] }
  return { jurusan: value, angkatan: '' }
}

export const emptyCandidateForm = (type, number = '') => ({
  id: '',
  type,
  number,
  name: '',
  ketua: '',
  wakil: '',
  jurusan: '',
  angkatan: '',
  ketuaJurusan: '',
  ketuaAngkatan: '',
  wakilJurusan: '',
  wakilAngkatan: '',
  photo: '',
  tagline: '',
  visi: '',
  misi: [''],
  programs: type === 'kabem' ? [''] : [],
})

/** Dokumen kandidat -> model formulir (mengisi field jurusan/angkatan dari `study` lama bila perlu). */
export function toCandidateForm(candidate) {
  const c = normalizeCandidate(candidate)
  const form = {
    ...emptyCandidateForm(c.type, c.number),
    id: c.id,
    name: c.name,
    ketua: c.ketua,
    wakil: c.wakil,
    photo: c.photo,
    tagline: c.tagline,
    visi: c.visi,
    misi: c.misi.length > 0 ? c.misi : [''],
    programs: c.type === 'kabem' ? (c.programs.length > 0 ? c.programs : ['']) : [],
  }

  if (c.type === 'ai') {
    const fallback = splitStudy(c.study)
    form.jurusan = asString(candidate.jurusan) || fallback.jurusan
    form.angkatan = asString(candidate.angkatan) || fallback.angkatan
  } else {
    const [ketuaPart = '', wakilPart = ''] = c.study.split('·')
    const ketua = splitStudy(ketuaPart)
    const wakil = splitStudy(wakilPart)
    form.ketuaJurusan = asString(candidate.ketuaJurusan) || ketua.jurusan
    form.ketuaAngkatan = asString(candidate.ketuaAngkatan) || ketua.angkatan
    form.wakilJurusan = asString(candidate.wakilJurusan) || wakil.jurusan
    form.wakilAngkatan = asString(candidate.wakilAngkatan) || wakil.angkatan
  }
  return form
}

const splitLines = (text) =>
  asString(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

const cleanPoints = (value) =>
  Array.isArray(value)
    ? value.map((item) => asString(item).trim()).filter(Boolean)
    : splitLines(value)

const joinStudy = (jurusan, angkatan, labelled) => {
  const j = asString(jurusan).trim()
  const a = asString(angkatan).trim()
  if (!j && !a) return ''
  if (labelled) return [j, a && `Angkatan ${a}`].filter(Boolean).join(', ')
  return [j, a].filter(Boolean).join(' ')
}

/** Model formulir -> payload Firestore (tanpa `id`). Tidak pernah berisi `undefined`. */
export function fromCandidateForm(form) {
  const type = form.type === 'kabem' ? 'kabem' : 'ai'
  const number = asString(form.number).trim()
  const base = {
    type,
    number,
    order: Number(number) || 0,
    role: CANDIDATE_TYPES[type].role,
    photo: asString(form.photo).trim(),
    tagline: asString(form.tagline).trim(),
    visi: asString(form.visi).trim(),
    misi: cleanPoints(form.misi ?? form.misiText),
    programs: type === 'kabem' ? cleanPoints(form.programs ?? form.programsText) : [],
  }

  if (type === 'ai') {
    return {
      ...base,
      name: asString(form.name).trim(),
      jurusan: asString(form.jurusan).trim(),
      angkatan: asString(form.angkatan).trim(),
      study: joinStudy(form.jurusan, form.angkatan, true),
    }
  }

  const ketua = asString(form.ketua).trim()
  const wakil = asString(form.wakil).trim()
  return {
    ...base,
    ketua,
    wakil,
    name: [ketua, wakil].filter(Boolean).join(' & '),
    ketuaJurusan: asString(form.ketuaJurusan).trim(),
    ketuaAngkatan: asString(form.ketuaAngkatan).trim(),
    wakilJurusan: asString(form.wakilJurusan).trim(),
    wakilAngkatan: asString(form.wakilAngkatan).trim(),
    study: [
      joinStudy(form.ketuaJurusan, form.ketuaAngkatan, false),
      joinStudy(form.wakilJurusan, form.wakilAngkatan, false),
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

/** Validasi formulir kandidat. Mengembalikan pesan error atau string kosong. */
export function validateCandidateForm(form) {
  if (!asString(form.number).trim()) return 'Nomor urut wajib diisi.'
  if (form.type === 'kabem') {
    if (!asString(form.ketua).trim()) return 'Nama calon Ketua BEM wajib diisi.'
    if (!asString(form.wakil).trim()) return 'Nama calon Wakil Ketua BEM wajib diisi.'
  } else if (!asString(form.name).trim()) {
    return 'Nama kandidat wajib diisi.'
  }
  if (!asString(form.visi).trim()) return 'Visi wajib diisi.'
  if (cleanPoints(form.misi ?? form.misiText).length === 0) return 'Isi minimal satu poin misi.'
  if (form.type === 'kabem' && cleanPoints(form.programs ?? form.programsText).length === 0) {
    return 'Isi minimal satu program prioritas.'
  }
  return ''
}

/** ID dokumen untuk kandidat baru. */
export const newCandidateId = (type) =>
  `${CANDIDATE_TYPES[type].idPrefix}-${Date.now().toString(36)}`
