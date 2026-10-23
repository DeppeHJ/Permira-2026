import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { ADMIN_EMAILS, BATCH_CHUNK_SIZE } from '../config'
import { ANGKATAN } from '../data'
import { downloadCsv, toCsv } from '../utils/csv'

/** Apakah user Firebase adalah Admin KPU yang sah (email/password + terdaftar). */
export const isAdminUser = (user) =>
  Boolean(user && !user.isAnonymous && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/user-disabled': 'Akun ini dinonaktifkan.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
  'auth/network-request-failed': 'Koneksi internet bermasalah.',
}

/** Login Admin KPU. Akun di luar daftar resmi langsung dikeluarkan kembali. */
export async function loginAdmin(email, password) {
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  if (!cleanEmail || !password) throw new Error('Email dan kata sandi wajib diisi.')

  if (!ADMIN_EMAILS.includes(cleanEmail)) {
    throw new Error('Akun ini tidak memiliki akses ke Dashboard KPU.')
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
 * dari data DPT. Dipakai setelah impor dan oleh tombol "Sinkronkan Statistik".
 */
export async function syncStats(records) {
  const totals = new Map(ANGKATAN.map((a) => [a.key, { total: 0, voted: 0 }]))
  for (const record of records) {
    const entry = totals.get(record.angkatan)
    if (!entry) continue
    entry.total += 1
    if (record.hasVoted) entry.voted += 1
  }

  const batch = writeBatch(db)
  ANGKATAN.forEach((angkatan, order) => {
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
export async function importDpt(rows, existingRecords, onProgress) {
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
  await syncStats([...merged.values()])
}

const todayStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

/** Unduh laporan kehadiran (tanpa data pilihan suara). */
export function downloadAttendanceReport(records) {
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
  downloadCsv(`laporan-kehadiran-permira-2026-${todayStamp()}.csv`, csv)
}

/** Unduh templat CSV DPT. */
export function downloadDptTemplate() {
  const csv = toCsv(
    ['npm', 'nama', 'email', 'angkatan'],
    [
      ['2602010001', 'Contoh Mahasiswa Satu', 'contoh1@kampus.ac.id', '2026'],
      ['2501020002', 'Contoh Mahasiswa Dua', 'contoh2@kampus.ac.id', '2025'],
      ['2303030003', 'Contoh Mahasiswa Magister', 'contoh3@kampus.ac.id', 'Magister'],
    ],
  )
  downloadCsv('template-dpt-permira-2026.csv', csv)
}
