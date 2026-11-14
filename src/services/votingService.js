import { signInAnonymously, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import { normalizeText } from '../utils/format'
import { NPM_REGEX } from '../utils/dpt'

const friendlyError = (error, fallback) => {
  if (error?.code === 'permission-denied') {
    return 'Akses ditolak. Sesi Anda mungkin berakhir — silakan keluar lalu masuk kembali.'
  }
  if (error?.code === 'unavailable') {
    return 'Server tidak dapat dijangkau. Periksa koneksi internet Anda.'
  }
  return error?.message || fallback
}

/**
 * Login pemilih: Anonymous Auth + validasi ke koleksi `dpt` (ID dokumen = NPM).
 * Pemilih ditolak jika data tidak cocok atau `hasVoted == true`.
 */
export async function loginVoter({ identity, npm }) {
  const cleanNpm = String(npm ?? '').trim()
  const cleanIdentity = normalizeText(identity)

  if (!cleanIdentity || !NPM_REGEX.test(cleanNpm)) {
    throw new Error('Masukkan Email/Nama dan NPM dengan format yang benar.')
  }

  try {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
      await signInAnonymously(auth)
    }

    const snap = await getDoc(doc(db, 'dpt', cleanNpm))
    const data = snap.exists() ? snap.data() : null

    // Pesan sengaja generik agar tidak membocorkan NPM mana yang terdaftar.
    if (
      !data ||
      (normalizeText(data.email) !== cleanIdentity && normalizeText(data.nama) !== cleanIdentity)
    ) {
      throw new Error('Data tidak ditemukan di DPT atau tidak cocok. Periksa kembali Email/Nama dan NPM Anda.')
    }

    return {
      npm: cleanNpm,
      nama: data.nama,
      email: data.email,
      angkatan: String(data.angkatan || '').toUpperCase(),
      hasVoted: data.hasVoted === true,
    }
  } catch (error) {
    throw new Error(friendlyError(error, 'Gagal masuk. Silakan coba lagi.'), { cause: error })
  }
}

/** Cek ulang status pemilih (dipakai saat sesi dipulihkan setelah refresh). */
export async function fetchVoterStatus(npm) {
  const snap = await getDoc(doc(db, 'dpt', npm))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    voter: {
      npm,
      nama: data.nama,
      email: data.email,
      angkatan: String(data.angkatan || '').toUpperCase(),
      hasVoted: data.hasVoted === true,
    },
    hasVoted: data.hasVoted === true,
  }
}

/**
 * Transaksi pemungutan suara (Asas Rahasia / Database Separation):
 *  1. `dpt/{npm}`   -> hasVoted: true, votedAt: serverTimestamp()   (identitas)
 *  2. `votes/{auto}`-> { aiId, kabemId }                            (kotak suara anonim)
 *  3. `stats/{angkatan}.voted` + 1                                  (statistik publik)
 * Dokumen `votes` TIDAK memuat NPM, email, nama, maupun waktu.
 */
export async function castVote({ npm, aiId, kabemId }) {
  const dptRef = doc(db, 'dpt', npm)
  const ballotRef = doc(collection(db, 'votes'))

  try {
    await runTransaction(db, async (tx) => {
      const dptSnap = await tx.get(dptRef)
      if (!dptSnap.exists()) {
        throw new Error('Data pemilih tidak ditemukan di DPT.')
      }
      const dpt = dptSnap.data()
      if (dpt.hasVoted === true) {
        throw new Error('Hak suara Anda sudah digunakan.')
      }

      const rawAngkatan = String(dpt.angkatan || '').trim()
      const upperKey = rawAngkatan.toUpperCase()
      const lowerKey = rawAngkatan.toLowerCase()

      const upperStatsRef = upperKey ? doc(db, 'stats', upperKey) : null
      const lowerStatsRef = lowerKey && lowerKey !== upperKey ? doc(db, 'stats', lowerKey) : null

      const upperSnap = upperStatsRef ? await tx.get(upperStatsRef) : null
      const lowerSnap = (!upperSnap || !upperSnap.exists()) && lowerStatsRef ? await tx.get(lowerStatsRef) : null

      const targetStatsRef = upperSnap?.exists() ? upperStatsRef : (lowerSnap?.exists() ? lowerStatsRef : null)
      const targetStatsSnap = upperSnap?.exists() ? upperSnap : (lowerSnap?.exists() ? lowerSnap : null)

      tx.update(dptRef, { hasVoted: true, votedAt: serverTimestamp() })
      tx.set(ballotRef, { aiId, kabemId })
      if (targetStatsRef && targetStatsSnap) {
        tx.update(targetStatsRef, { voted: (targetStatsSnap.data().voted || 0) + 1 })
      }
    })
  } catch (error) {
    throw new Error(friendlyError(error, 'Suara gagal dikirim. Silakan coba lagi.'), { cause: error })
  }
}

/** Langganan real-time statistik pemilih per angkatan (dibaca pemilih & admin). */
export function subscribeStats(onData, onError) {
  return onSnapshot(
    collection(db, 'stats'),
    (snapshot) => {
      const map = {}
      snapshot.forEach((d) => {
        map[d.id] = d.data()
      })
      onData(map)
    },
    onError,
  )
}

export const logout = () => signOut(auth)
