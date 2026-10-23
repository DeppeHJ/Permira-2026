import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { FIREBASE_CONFIG } from './config'

/**
 * False jika .env belum diisi (kosong atau masih berisi nilai contoh "ISI_...").
 * App.jsx menampilkan layar panduan konfigurasi alih-alih crash.
 */
export const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    !String(FIREBASE_CONFIG.apiKey).startsWith('ISI_') &&
    !String(FIREBASE_CONFIG.projectId).startsWith('ISI_'),
)

export const app = isFirebaseConfigured ? initializeApp(FIREBASE_CONFIG) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
