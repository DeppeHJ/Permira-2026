import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { BATCH_CHUNK_SIZE } from '../config'
import { AI_CANDIDATES, KABEM_CANDIDATES } from '../data'
import { fromCandidateForm, toCandidateForm } from '../utils/candidates'
import { downloadCsv, toCsv } from '../utils/csv'
import { downloadAttendanceReport, syncStats } from './adminService'

/**
 * Semua fungsi di sini hanya berhasil jika login sebagai Super Admin —
 * penegakan sebenarnya ada di firestore.rules, bukan di sisi klien.
 */

const chunk = (items, size) => {
  const result = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

/* -------------------------------------------------------------------------- */
/* Tahun & nama pemilihan                                                     */
/* -------------------------------------------------------------------------- */

export async function saveElectionSettings({ name, year, angkatanCount, description }) {
  const payload = { name, year, angkatanCount, updatedAt: serverTimestamp() }
  if (typeof description === 'string') {
    payload.description = description
  }
  await setDoc(doc(db, 'config', 'election'), payload, { merge: true })
}

/* -------------------------------------------------------------------------- */
/* Timeline & SOP                                                             */
/* -------------------------------------------------------------------------- */

export async function saveTimeline(items) {
  await setDoc(doc(db, 'config', 'timeline'), { items, updatedAt: serverTimestamp() })
}

export async function saveSop(tabs) {
  await setDoc(doc(db, 'config', 'sop'), { tabs, updatedAt: serverTimestamp() })
}

/* -------------------------------------------------------------------------- */
/* Kategori Pemilih                                                           */
/* -------------------------------------------------------------------------- */

export async function saveCategories(categories) {
  await setDoc(doc(db, 'config', 'categories'), {
    items: categories,
    updatedAt: serverTimestamp(),
  })
  await resyncStatsFromDpt(categories)
}

/* -------------------------------------------------------------------------- */
/* Narahubung / Contact Person                                                */
/* -------------------------------------------------------------------------- */

export async function saveContacts(contacts) {
  await setDoc(doc(db, 'config', 'contacts'), {
    items: contacts,
    updatedAt: serverTimestamp(),
  })
}

export async function saveFaqs(faqs) {
  await setDoc(doc(db, 'config', 'faqs'), {
    items: faqs,
    updatedAt: serverTimestamp(),
  })
}

/* -------------------------------------------------------------------------- */
/* Kandidat                                                                   */
/* -------------------------------------------------------------------------- */

/** Simpan kandidat bawaan (data.js) ke Firestore agar bisa disunting. Dipanggil sekali. */
export async function seedDefaultCandidates() {
  const batch = writeBatch(db)
  ;[...AI_CANDIDATES, ...KABEM_CANDIDATES].forEach((candidate) => {
    batch.set(doc(db, 'candidates', candidate.id), fromCandidateForm(toCandidateForm(candidate)))
  })
  batch.set(doc(db, 'config', 'election'), { candidatesSeeded: true }, { merge: true })
  await batch.commit()
}

/**
 * Simpan (tambah/ubah) satu kandidat. `needsSeed` = true bila kandidat masih berasal dari
 * data bawaan, sehingga data bawaan disalin ke database lebih dulu.
 */
export async function saveCandidate(id, form, { needsSeed = false } = {}) {
  if (needsSeed) await seedDefaultCandidates()
  await setDoc(doc(db, 'candidates', id), fromCandidateForm(form))
  await setDoc(doc(db, 'config', 'election'), { candidatesSeeded: true }, { merge: true })
}

export async function deleteCandidate(id, { needsSeed = false } = {}) {
  if (needsSeed) await seedDefaultCandidates()
  await deleteDoc(doc(db, 'candidates', id))
}

/* -------------------------------------------------------------------------- */
/* Cadangan & reset data pemilihan                                            */
/* -------------------------------------------------------------------------- */

async function fetchDptRecords() {
  const snap = await getDocs(collection(db, 'dpt'))
  return snap.docs.map((d) => {
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
}

/** Hitung ulang koleksi `stats` dari DPT di database memakai daftar angkatan tertentu. */
export async function resyncStatsFromDpt(angkatan) {
  await syncStats(await fetchDptRecords(), angkatan)
}

/** Unduh cadangan: laporan kehadiran + rekap perolehan suara per kandidat. */
export async function downloadElectionBackup({ appName, candidates }) {
  const [records, votesSnap] = await Promise.all([fetchDptRecords(), getDocs(collection(db, 'votes'))])

  const tally = { ai: {}, kabem: {} }
  votesSnap.forEach((d) => {
    const { aiId, kabemId } = d.data()
    tally.ai[aiId] = (tally.ai[aiId] || 0) + 1
    tally.kabem[kabemId] = (tally.kabem[kabemId] || 0) + 1
  })

  const rows = candidates.map((c) => [
    c.type === 'ai' ? 'Anggota Independen' : 'Ketua & Wakil BEM',
    c.number,
    c.name,
    tally[c.type][c.id] || 0,
  ])
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const slug = String(appName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  downloadAttendanceReport(records, appName)
  downloadCsv(
    `rekap-suara-${slug}-${stamp}.csv`,
    toCsv(['Kategori', 'Nomor Urut', 'Nama', 'Jumlah Suara'], rows),
  )
  return { voters: records.length, ballots: votesSnap.size }
}

async function deleteCollection(name, onProgress) {
  let totalDeleted = 0
  for (let pass = 0; pass < 10; pass++) {
    const snap = await getDocs(collection(db, name))
    if (snap.empty) break
    const refs = snap.docs.map((d) => d.ref)
    const passStart = totalDeleted
    for (const part of chunk(refs, BATCH_CHUNK_SIZE)) {
      const batch = writeBatch(db)
      part.forEach((ref) => batch.delete(ref))
      await batch.commit()
      totalDeleted += part.length
      onProgress?.(name, totalDeleted, passStart + refs.length)
    }
  }
  return totalDeleted
}

async function resetDptVotingStatus(onProgress) {
  const snap = await getDocs(collection(db, 'dpt'))
  const votedDocs = snap.docs.filter((d) => {
    const data = d.data() || {}
    return data.hasVoted !== false || data.votedAt != null
  })
  let done = 0
  for (const part of chunk(votedDocs, BATCH_CHUNK_SIZE)) {
    try {
      const batch = writeBatch(db)
      part.forEach((d) => {
        batch.update(d.ref, { hasVoted: false, votedAt: null })
      })
      await batch.commit()
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase()
      if (err?.code === 'permission-denied' || msg.includes('permission')) {
        const delBatch = writeBatch(db)
        part.forEach((d) => delBatch.delete(d.ref))
        await delBatch.commit()

        const setBatch = writeBatch(db)
        part.forEach((d) => {
          const data = d.data() || {}
          setBatch.set(d.ref, {
            npm: String(data.npm || d.id),
            nama: String(data.nama || '-'),
            email: String(data.email || '-'),
            angkatan: String(data.angkatan || 'UMUM').toUpperCase(),
            hasVoted: false,
            votedAt: null,
          })
        })
        await setBatch.commit()
      } else {
        throw err
      }
    }
    done += part.length
    onProgress?.('dpt-reset', done, votedDocs.length)
  }
  return votedDocs.length
}

/**
 * Reset data pemilihan untuk periode baru.
 *  - `dpt`   : hapus seluruh DPT (termasuk yang sudah memilih) lalu nolkan statistik.
 *  - `votes` : kosongkan kotak suara anonim, reset status memilih di DPT, dan hitung ulang statistik.
 */
export async function resetElectionData({ dpt, votes, angkatan }, onProgress) {
  const result = { dpt: 0, votes: 0, dptReset: 0 }
  if (votes) result.votes = await deleteCollection('votes', onProgress)
  if (dpt) {
    result.dpt = await deleteCollection('dpt', onProgress)
    await syncStats([], angkatan)
  } else if (votes) {
    result.dptReset = await resetDptVotingStatus(onProgress)
    await resyncStatsFromDpt(angkatan)
  }
  try {
    sessionStorage.removeItem('permira_voter_session')
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
  return result
}
