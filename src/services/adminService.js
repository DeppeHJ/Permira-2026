import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { ADMIN_EMAILS, BATCH_CHUNK_SIZE, SUPER_ADMIN_EMAILS } from '../config'
import { ANGKATAN as DEFAULT_ANGKATAN } from '../data'
import { downloadCsv, toCsv } from '../utils/csv'

const isListedUser = (user, list) =>
  Boolean(user && !user.isAnonymous && user.email && list.includes(user.email.toLowerCase()))

/** Super Admin (email/password + terdaftar di VITE_SUPER_ADMIN_EMAILS). */
export const isSuperAdminUser = (user) => isListedUser(user, SUPER_ADMIN_EMAILS)

/** Admin Panitia yang sah. Super Admin otomatis juga dianggap Admin Panitia. */
export const isAdminUser = (user) =>
  isListedUser(user, ADMIN_EMAILS) || isSuperAdminUser(user)

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/user-disabled': 'Akun ini dinonaktifkan.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
  'auth/network-request-failed': 'Koneksi internet bermasalah.',
}

/** Login Admin Panitia. Akun di luar daftar resmi langsung dikeluarkan kembali. */
export async function loginAdmin(email, password) {
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  if (!cleanEmail || !password) throw new Error('Email dan kata sandi wajib diisi.')

  if (!ADMIN_EMAILS.includes(cleanEmail) && !SUPER_ADMIN_EMAILS.includes(cleanEmail)) {
    throw new Error('Akun ini tidak memiliki akses ke Dashboard Panitia.')
  }

  try {
    await signInWithEmailAndPassword(auth, cleanEmail, password)
  } catch (error) {
    throw new Error(AUTH_ERRORS[error.code] || 'Gagal masuk. Silakan coba lagi.', { cause: error })
  }
}

export const logoutAdmin = () => signOut(auth)

/** Langganan real-time seluruh DPT (hanya admin). */
export function subscribeDpt(onData, onError) {
  return onSnapshot(
    collection(db, 'dpt'),
    (snapshot) => {
      const records = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          npm: d.id,
          nama: data.nama,
          email: data.email,
          angkatan: data.angkatan,
          hasVoted: data.hasVoted === true,
          votedAt: data.votedAt?.toDate ? data.votedAt.toDate() : null,
        }
      })
      onData(records)
    },
    onError,
  )
}

/** Langganan real-time kotak suara anonim (hanya admin). */
export function subscribeVotes(onData, onError) {
  return onSnapshot(
    collection(db, 'votes'),
    (snapshot) => onData(snapshot.docs.map((d) => d.data())),
    onError,
  )
}

/** Hitung perolehan suara dari daftar surat suara anonim. */
export function tallyVotes(ballots) {
  const ai = {}
  const kabem = {}
  for (const ballot of ballots) {
    ai[ballot.aiId] = (ai[ballot.aiId] || 0) + 1
    kabem[ballot.kabemId] = (kabem[ballot.kabemId] || 0) + 1
  }
  return { ai, kabem, total: ballots.length }
}

const chunk = (items, size) => {
  const result = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

/**
 * Hitung ulang & tulis koleksi `stats` (total & sudah memilih per angkatan)
 * dari data DPT. Dokumen statistik angkatan yang sudah tidak dipakai ikut dihapus.
 * Dipakai setelah impor, reset, dan oleh tombol "Sinkronkan Statistik".
 */
export async function syncStats(records, angkatanList = DEFAULT_ANGKATAN) {
  const totals = new Map(angkatanList.map((a) => [a.key, { total: 0, voted: 0 }]))
  for (const record of records) {
    let entry = totals.get(record.angkatan)
    if (!entry && record.angkatan) {
      const match = angkatanList.find(
        (a) =>
          a.label === record.angkatan ||
          a.label.toLowerCase() === String(record.angkatan).toLowerCase(),
      )
      if (match) entry = totals.get(match.key)
    }
    if (!entry) continue
    entry.total += 1
    if (record.hasVoted) entry.voted += 1
  }

  const existing = await getDocs(collection(db, 'stats'))
  const batch = writeBatch(db)
  existing.forEach((d) => {
    if (!totals.has(d.id)) batch.delete(d.ref)
  })
  angkatanList.forEach((angkatan, order) => {
    const { total, voted } = totals.get(angkatan.key)
    batch.set(doc(db, 'stats', angkatan.key), { label: angkatan.label, order, total, voted })
  })
  await batch.commit()
}

/**
 * Impor DPT massal memakai writeBatch dengan chunk maksimal 450 operasi.
 * Pemilih yang sudah ada hanya diperbarui nama/email/angkatan-nya; status
 * `hasVoted`/`votedAt` TIDAK pernah ditimpa. Pemilih baru dibuat dengan hasVoted=false.
 */
export async function importDpt(rows, existingRecords, onProgress, angkatanList = DEFAULT_ANGKATAN) {
  const existing = new Map(existingRecords.map((r) => [r.npm, r]))
  const chunks = chunk(rows, BATCH_CHUNK_SIZE)
  let done = 0

  for (const part of chunks) {
    const batch = writeBatch(db)
    for (const row of part) {
      const ref = doc(db, 'dpt', row.npm)
      if (existing.has(row.npm)) {
        batch.set(ref, { npm: row.npm, nama: row.nama, email: row.email, angkatan: row.angkatan }, { merge: true })
      } else {
        batch.set(ref, { ...row, hasVoted: false, votedAt: null })
      }
    }
    await batch.commit()
    done += part.length
    onProgress?.(done, rows.length)
  }

  // Gabungkan state lokal agar statistik langsung akurat tanpa menunggu snapshot.
  const merged = new Map(existing)
  for (const row of rows) {
    const prev = merged.get(row.npm)
    merged.set(row.npm, { ...row, hasVoted: prev?.hasVoted === true, votedAt: prev?.votedAt ?? null })
  }
  await syncStats([...merged.values()], angkatanList)
}

const todayStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')
const slugify = (text) =>
  String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Unduh laporan kehadiran (tanpa data pilihan suara). */
export function downloadAttendanceReport(records, appName = 'PERMIRA 2026') {
  const rows = [...records]
    .sort((a, b) => a.npm.localeCompare(b.npm))
    .map((r) => [
      r.npm,
      r.nama,
      r.email,
      r.angkatan,
      r.hasVoted ? 'Sudah Memilih' : 'Belum Memilih',
      r.votedAt ? r.votedAt.toLocaleString('id-ID') : '',
    ])
  const csv = toCsv(['NPM', 'Nama', 'Email', 'Angkatan', 'Status', 'Waktu Memilih'], rows)
  downloadCsv(`laporan-kehadiran-${slugify(appName)}-${todayStamp()}.csv`, csv)
}

/** Unduh templat CSV DPT (contoh angkatan mengikuti daftar angkatan aktif). */
export function downloadDptTemplate(angkatanList = DEFAULT_ANGKATAN, appName = 'PERMIRA 2026') {
  const [first, second] = angkatanList
  const yy = (key) => String(key).slice(-2)
  const csv = toCsv(
    ['npm', 'nama', 'email', 'angkatan'],
    [
      [`${yy(first.key)}02010001`, 'Contoh Mahasiswa Satu', 'contoh1@kampus.ac.id', first.key],
      [`${yy(second.key)}01020002`, 'Contoh Mahasiswa Dua', 'contoh2@kampus.ac.id', second.key],
      ['2303030003', 'Contoh Mahasiswa Magister', 'contoh3@kampus.ac.id', 'Magister'],
    ],
  )
  downloadCsv(`template-dpt-${slugify(appName)}.csv`, csv)
}

