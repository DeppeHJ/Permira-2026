import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import {
  AI_CANDIDATES,
  DEFAULT_CONTACTS,
  DEFAULT_ELECTION,
  ELECTION_TIMELINE,
  KABEM_CANDIDATES,
  SOP_TABS,
  VOTING_STEPS,
  buildAngkatan,
} from '../data'
import { normalizeCandidate, sortCandidates } from '../utils/candidates'
import { ElectionContext } from './electionContext'

const SOURCES = ['election', 'timeline', 'sop', 'categories', 'contacts', 'candidates']
const READY_TIMEOUT_MS = 4000

const DEFAULT_CANDIDATES = [...AI_CANDIDATES, ...KABEM_CANDIDATES]

/**
 * Menyediakan data pemilihan yang bisa diubah Super Admin:
 *  - `config/election`    { name, year, angkatanCount, candidatesSeeded }
 *  - `config/categories`  { items: [...] }
 *  - `config/contacts`    { items: [...] }
 *  - `config/timeline`    { items: [...] }
 *  - `config/sop`         { tabs: [...] }
 *  - `candidates/{id}`
 * Jika dokumen belum ada (atau rules belum di-deploy), dipakai data bawaan dari data.js.
 */
export default function ElectionProvider({ children }) {
  const [electionDoc, setElectionDoc] = useState(null)
  const [categoriesDoc, setCategoriesDoc] = useState(null)
  const [contactsDoc, setContactsDoc] = useState(null)
  const [timelineDoc, setTimelineDoc] = useState(null)
  const [sopDoc, setSopDoc] = useState(null)
  const [candidateDocs, setCandidateDocs] = useState(null)
  const [loaded, setLoaded] = useState({})
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    const mark = (key) => setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
    const watchDoc = (id, key, setter) =>
      onSnapshot(
        doc(db, 'config', id),
        (snap) => {
          setter(snap.exists() ? snap.data() : null)
          mark(key)
        },
        () => {
          setter(null)
          mark(key)
        },
      )

    const unsubscribers = [
      watchDoc('election', 'election', setElectionDoc),
      watchDoc('categories', 'categories', setCategoriesDoc),
      watchDoc('contacts', 'contacts', setContactsDoc),
      watchDoc('timeline', 'timeline', setTimelineDoc),
      watchDoc('sop', 'sop', setSopDoc),
      onSnapshot(
        collection(db, 'candidates'),
        (snap) => {
          setCandidateDocs(snap.docs.map((d) => ({ ...d.data(), id: d.id })))
          mark('candidates')
        },
        () => {
          setCandidateDocs(null)
          mark('candidates')
        },
      ),
    ]
    const timer = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS)

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
      clearTimeout(timer)
    }
  }, [])

  const ready = !isFirebaseConfigured || timedOut || SOURCES.every((key) => loaded[key])

  const rawName = electionDoc?.name?.trim()
  const name = !rawName || rawName === 'PERMIRA' ? DEFAULT_ELECTION.name : rawName
  const year = Number(electionDoc?.year) || DEFAULT_ELECTION.year
  const angkatanCount = Number(electionDoc?.angkatanCount) || DEFAULT_ELECTION.angkatanCount
  const candidatesSeeded = electionDoc?.candidatesSeeded === true

  const value = useMemo(() => {
    const rawCategories =
      Array.isArray(categoriesDoc?.items) && categoriesDoc.items.length > 0
        ? categoriesDoc.items
        : Array.isArray(electionDoc?.categories) && electionDoc.categories.length > 0
          ? electionDoc.categories
          : null

    const angkatan = rawCategories || buildAngkatan(year, angkatanCount)

    const contacts =
      Array.isArray(contactsDoc?.items) && contactsDoc.items.length > 0
        ? contactsDoc.items
        : DEFAULT_CONTACTS

    const hasStoredCandidates = Boolean(candidateDocs && candidateDocs.length > 0)
    const usingDefaultCandidates = !candidatesSeeded && !hasStoredCandidates
    const source = usingDefaultCandidates ? DEFAULT_CANDIDATES : (candidateDocs ?? [])
    const candidates = sortCandidates(source.map(normalizeCandidate))
    const aiCandidates = candidates.filter((c) => c.type === 'ai')
    const kabemCandidates = candidates.filter((c) => c.type === 'kabem')

    const timeline = Array.isArray(timelineDoc?.items) ? timelineDoc.items : ELECTION_TIMELINE
    const sop = Array.isArray(sopDoc?.tabs) && sopDoc.tabs.length > 0 ? sopDoc.tabs : SOP_TABS

    return {
      ready,
      name,
      year,
      angkatanCount,
      appName: `${name} ${year}`,
      angkatan,
      contacts,
      timeline,
      sop,
      candidates,
      aiCandidates,
      kabemCandidates,
      usingDefaultCandidates,
      candidatesSeeded,
      getCandidate: (id) => candidates.find((c) => c.id === id) || null,
      votingSteps: {
        ai: { ...VOTING_STEPS.ai, candidates: aiCandidates },
        kabem: { ...VOTING_STEPS.kabem, candidates: kabemCandidates },
      },
    }
  }, [
    ready,
    name,
    year,
    angkatanCount,
    candidatesSeeded,
    candidateDocs,
    timelineDoc,
    sopDoc,
    categoriesDoc,
    contactsDoc,
    electionDoc,
  ])

  return <ElectionContext.Provider value={value}>{children}</ElectionContext.Provider>
}
