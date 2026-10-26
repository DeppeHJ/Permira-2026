import { createContext, useContext } from 'react'

export const ElectionContext = createContext(null)

/** Data pemilihan aktif: tahun, angkatan, timeline, SOP, dan kandidat. */
export function useElection() {
  const value = useContext(ElectionContext)
  if (!value) throw new Error('useElection harus dipakai di dalam <ElectionProvider>.')
  return value
}
