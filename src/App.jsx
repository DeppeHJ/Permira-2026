import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { TriangleAlert } from 'lucide-react'
import { auth, isFirebaseConfigured } from './firebase'
import { Spinner, ToastNotification, TopNav } from './components/SharedUI'
import BallotPrivacyShield from './components/BallotPrivacyShield'
import { useElection } from './context/electionContext'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminLoginPage from './pages/AdminLoginPage'
import ContactPage from './pages/ContactPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ReviewOtpPage from './pages/ReviewOtpPage'
import SopPage from './pages/SopPage'
import SuccessPage from './pages/SuccessPage'
import SuperAdminPage from './pages/superadmin/SuperAdminPage'
import VotingPage from './pages/VotingPage'
import { isAdminUser, isSuperAdminUser, loginAdmin, logoutAdmin } from './services/adminService'
import { sendOtp, verifyOtp } from './services/otpService'
import {
  castVote,
  fetchVoterStatus,
  loginVoter,
  logout,
  subscribeStats,
} from './services/votingService'

const SESSION_KEY = 'permira_voter_session'

const HASH_TO_PAGE = {
  '#/dashboard': 'dashboard',
  '#/voting': 'voting',
  '#/vote-ai': 'voteAI',
  '#/vote-kabem': 'voteKabem',
  '#/review': 'review',
  '#/sop': 'sop',
  '#/contact': 'contact',
  '#/success': 'success',
}

const PAGE_TO_HASH = {
  dashboard: '#/dashboard',
  voting: '#/voting',
  voteAI: '#/vote-ai',
  voteKabem: '#/vote-kabem',
  review: '#/review',
  sop: '#/sop',
  contact: '#/contact',
  success: '#/success',
}

const readSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {}
  } catch {
    return {}
  }
}

const getRoute = () => {
  const hash = window.location.hash
  if (hash.startsWith('#/superadmin')) return 'super'
  return hash.startsWith('#/panitia') || hash.startsWith('#/kpu') ? 'admin' : 'voter'
}

const getInitialPage = () => {
  const hash = window.location.hash
  return HASH_TO_PAGE[hash] || 'dashboard'
}

function ConfigMissing() {
  return (
    <main className="grid min-h-screen place-items-center bg-bean px-4">
      <div className="max-w-lg rounded-2xl border border-gold/25 bg-card-dark p-8 text-gold">
        <TriangleAlert className="h-10 w-10 text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold">Konfigurasi Firebase belum diisi</h1>
        <p className="mt-2 text-sm text-gold/80">
          Salin <code className="font-mono">.env.example</code> menjadi{' '}
          <code className="font-mono">.env</code>, isi seluruh nilai{' '}
          <code className="font-mono">VITE_FIREBASE_*</code>, lalu jalankan ulang{' '}
          <code className="font-mono">npm run dev</code>.
        </p>
      </div>
    </main>
  )
}

export default function App() {
  const { ready: electionReady, appName } = useElection()
  const [route, setRoute] = useState(getRoute)
  const [authReady, setAuthReady] = useState(false)
  const [authUser, setAuthUser] = useState(null)

  const [voter, setVoter] = useState(() => readSession().voter || null)
  const [selections, setSelections] = useState(() => readSession().selections || {})
  const [sopAgreed, setSopAgreed] = useState(() => Boolean(readSession().sopAgreed))
  const sopAgreedRef = useRef(sopAgreed)
  const [page, setPage] = useState(getInitialPage)

  const [stats, setStats] = useState({})
  const [statsReady, setStatsReady] = useState(false)

  const [toast, setToast] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const restoredRef = useRef(false)

  /* ----------------------------- Notifikasi ----------------------------- */
  const showToast = useCallback((payload) => {
    setToast({ id: `${Date.now()}-${Math.random()}`, duration: 5000, ...payload })
  }, [])
  const closeToast = useCallback(() => setToast(null), [])

  /* ------------------------------ Autentikasi ---------------------------- */
  useEffect(() => {
    if (!isFirebaseConfigured) return undefined
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user)
      setAuthReady(true)
    })
  }, [])

  // Sesi pemilih hanya valid selama user anonim Firebase masih aktif.
  const activeVoter = authReady && authUser?.isAnonymous ? voter : null
  const adminUser = authReady && isAdminUser(authUser) ? authUser : null
  const superUser = authReady && isSuperAdminUser(authUser) ? authUser : null

  // Routing hash dua arah: merespons tombol browser Back/Forward & portal admin #/panitia.
  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = getRoute()
      setRoute(nextRoute)

      if (nextRoute === 'voter' && activeVoter) {
        const hash = window.location.hash
        // Jangan auto log out saat user menekan back hingga hash kosong/#
        if (!hash || hash === '#' || hash === '#/') {
          setPage('dashboard')
          return
        }

        let mappedPage = HASH_TO_PAGE[hash] || 'dashboard'

        // Proteksi pemilih yang sudah menggunakan hak suara
        if (activeVoter.hasVoted && ['voting', 'voteAI', 'voteKabem', 'review'].includes(mappedPage)) {
          window.location.hash = '#/dashboard'
          setPage('dashboard')
          showToast({
            type: 'info',
            title: 'Hak Suara Sudah Digunakan',
            message: 'Anda sudah menggunakan hak suara dan hanya dapat melihat dashboard statistik.',
          })
          return
        }

        // Alur voting: pemilih wajib membaca dan menyetujui SOP terlebih dahulu
        if (!(sopAgreed || sopAgreedRef.current) && ['voting', 'voteAI', 'voteKabem', 'review'].includes(mappedPage)) {
          window.location.hash = '#/sop'
          setPage('sop')
          showToast({
            type: 'info',
            title: 'Wajib Baca SOP Terlebih Dahulu',
            message: 'Silakan baca dan setujui SOP Pemilihan sebelum melanjutkan ke bilik suara.',
          })
          return
        }

        if (mappedPage === 'voting') {
          const targetVotingPage = selections.aiId
            ? (selections.kabemId ? 'review' : 'voteKabem')
            : 'voteAI'
          window.location.hash = PAGE_TO_HASH[targetVotingPage] || '#/vote-ai'
          setPage(targetVotingPage)
          window.scrollTo(0, 0)
          return
        }

        // Proteksi halaman review jika pilihan belum lengkap
        if (mappedPage === 'review' && !(selections.aiId && selections.kabemId)) {
          const fallback = selections.aiId ? 'voteKabem' : 'voteAI'
          window.location.hash = PAGE_TO_HASH[fallback]
          setPage(fallback)
          window.scrollTo(0, 0)
          return
        }

        setPage(mappedPage)
        window.scrollTo(0, 0)
      }
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [activeVoter, selections, sopAgreed, showToast])

  // Simpan sesi (hanya identitas dasar, pilihan sementara, dan konfirmasi SOP).
  useEffect(() => {
    if (voter) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ voter, selections, sopAgreed }))
    } else {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }, [voter, selections, sopAgreed])

  const resetVoterState = useCallback(() => {
    setVoter(null)
    setSelections({})
    sopAgreedRef.current = false
    setSopAgreed(false)
    setPage('dashboard')
    restoredRef.current = false
  }, [])

  const handleAgreeSop = useCallback((agreed = true) => {
    const next = Boolean(agreed)
    sopAgreedRef.current = next
    setSopAgreed(next)
  }, [])

  const handleLogout = useCallback(async () => {
    resetVoterState()
    window.location.hash = ''
    try {
      await logout()
    } catch {
      /* sesi lokal sudah dibersihkan */
    }
  }, [resetVoterState])

  // Sinkronisasi status di DPT setelah refresh/login.
  useEffect(() => {
    if (!activeVoter || restoredRef.current) return
    restoredRef.current = true
    fetchVoterStatus(activeVoter.npm)
      .then((status) => {
        if (!status) {
          resetVoterState()
        } else {
          const hasVoted = Boolean(status.hasVoted)
          setVoter((prev) => (prev ? { ...prev, hasVoted } : prev))
          if (hasVoted) {
            setPage((prev) => {
              if (['voting', 'voteAI', 'voteKabem', 'review'].includes(prev)) {
                window.location.hash = '#/dashboard'
                return 'dashboard'
              }
              return prev
            })
          }
        }
      })
      .catch(() => {})
  }, [activeVoter, resetVoterState])

  // Statistik publik per angkatan (real-time) untuk dashboard pemilih.
  const voterNpm = activeVoter?.npm
  useEffect(() => {
    if (!voterNpm) return undefined
    return subscribeStats(
      (data) => {
        setStats(data)
        setStatsReady(true)
      },
      () => setStatsReady(true),
    )
  }, [voterNpm])

  /* ------------------------------- Navigasi ------------------------------ */
  const navigate = useCallback(
    (target) => {
      let resolvedTarget = target

      if (activeVoter?.hasVoted && ['voting', 'voteAI', 'voteKabem', 'review'].includes(resolvedTarget)) {
        showToast({
          type: 'info',
          title: 'Hak Suara Sudah Digunakan',
          message: 'Anda sudah menggunakan hak suara dan hanya dapat melihat dashboard statistik.',
        })
        resolvedTarget = 'dashboard'
      } else if (!(sopAgreed || sopAgreedRef.current) && ['voting', 'voteAI', 'voteKabem', 'review'].includes(resolvedTarget)) {
        showToast({
          type: 'info',
          title: 'Wajib Baca SOP Terlebih Dahulu',
          message: 'Silakan baca dan setujui SOP Pemilihan sebelum melanjutkan ke bilik suara.',
        })
        resolvedTarget = 'sop'
      } else if (resolvedTarget === 'voting') {
        resolvedTarget = selections.aiId ? (selections.kabemId ? 'review' : 'voteKabem') : 'voteAI'
      } else if (resolvedTarget === 'review' && !(selections.aiId && selections.kabemId)) {
        showToast({
          type: 'error',
          title: 'Pilihan belum lengkap',
          message: 'Pilih kandidat AI dan Kabem terlebih dahulu.',
        })
        resolvedTarget = selections.aiId ? 'voteKabem' : 'voteAI'
      }

      setPage(resolvedTarget)
      const targetHash = PAGE_TO_HASH[resolvedTarget] || '#/dashboard'
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash
      }
      window.scrollTo(0, 0)
    },
    [activeVoter, selections, sopAgreed, showToast],
  )

  const handleSelect = (key, id) => setSelections((prev) => ({ ...prev, [key]: id }))

  /* ------------------------------ Aksi Pemilih --------------------------- */
  const handleVoterLogin = async ({ identity, npm }) => {
    setLoginLoading(true)
    setLoginError('')
    try {
      const data = await loginVoter({ identity, npm })
      setVoter(data)
      setSelections({})
      sopAgreedRef.current = false
      setSopAgreed(false)
      setPage('dashboard')
      window.location.hash = '#/dashboard'
      restoredRef.current = true
      showToast({ type: 'success', title: 'Berhasil masuk', message: `Selamat datang, ${data.nama}.` })
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSendOtp = async () => {
    await sendOtp({ npm: activeVoter.npm, nama: activeVoter.nama, email: activeVoter.email })
    showToast({
      type: 'mail',
      title: 'Kode OTP terkirim',
      message:
        'Periksa email terdaftar Anda (termasuk folder spam). Kode berlaku 3 menit dan hanya dapat dipakai sekali.',
      duration: 7000,
    })
  }

  /**
   * Submit final: verifikasi OTP di server Apps Script, lalu jalankan transaksi
   * Firestore (dpt.hasVoted + votes anonim).
   */
  const handleFinalSubmit = async (code) => {
    if (!selections.aiId || !selections.kabemId) {
      throw new Error('Pilihan belum lengkap. Kembali dan pilih kandidat AI serta Kabem.')
    }
    await verifyOtp({ npm: activeVoter.npm, otp: code })
    try {
      await castVote({ npm: activeVoter.npm, aiId: selections.aiId, kabemId: selections.kabemId })
    } catch (error) {
      throw new Error(`${error.message} Kode OTP sudah terpakai — kirim ulang OTP lalu coba lagi.`, {
        cause: error,
      })
    }
    setSelections({})
    setVoter((prev) => (prev ? { ...prev, hasVoted: true } : prev))
    setPage('success')
    window.location.hash = '#/success'
    window.scrollTo({ top: 0 })
    showToast({ type: 'success', title: 'Suara terkirim', message: 'Terima kasih telah memilih.' })
  }

  /* ------------------------------- Aksi Admin ---------------------------- */
  const handleAdminLogin = async (email, password) => {
    setAdminLoading(true)
    setAdminError('')
    try {
      await loginAdmin(email, password)
    } catch (error) {
      setAdminError(error.message)
    } finally {
      setAdminLoading(false)
    }
  }

  const goVoter = () => {
    window.location.hash = activeVoter ? '#/dashboard' : ''
  }
  const goAdmin = () => {
    window.location.hash = '#/panitia'
  }

  /* -------------------------------- Render ------------------------------- */
  if (!isFirebaseConfigured) return <ConfigMissing />

  if (!authReady || !electionReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-bean text-gold">
        <div className="flex items-center gap-3 font-semibold">
          <Spinner className="h-6 w-6" /> Memuat {appName}…
        </div>
      </main>
    )
  }

  let content
  if (route === 'super') {
    content = superUser ? (
      <SuperAdminPage user={superUser} onLogout={logoutAdmin} showToast={showToast} />
    ) : (
      <AdminLoginPage
        variant="super"
        onLogin={handleAdminLogin}
        loading={adminLoading}
        error={adminUser ? 'Akun ini bukan Super Admin. Masuk dengan akun Super Admin.' : adminError}
        onBack={goVoter}
      />
    )
  } else if (route === 'admin') {
    content = adminUser ? (
      <AdminDashboardPage
        user={adminUser}
        onLogout={logoutAdmin}
        showToast={showToast}
        isSuper={Boolean(superUser)}
      />
    ) : (
      <AdminLoginPage
        onLogin={handleAdminLogin}
        loading={adminLoading}
        error={adminError}
        onBack={goVoter}
      />
    )
  } else if (!activeVoter) {
    if (page === 'contact') {
      content = (
        <div className="min-h-screen bg-bean pb-12">
          <ContactPage onBack={() => navigate('dashboard')} onNavigate={navigate} />
        </div>
      )
    } else if (page === 'sop') {
      content = (
        <div className="min-h-screen bg-bean pb-12">
          <SopPage onNavigate={navigate} onBack={() => navigate('dashboard')} />
        </div>
      )
    } else {
      content = (
        <LoginPage
          onLogin={handleVoterLogin}
          loading={loginLoading}
          error={loginError}
          onGoAdmin={goAdmin}
          onNavigate={navigate}
        />
      )
    }
  } else if (page === 'success') {
    content = <SuccessPage voter={activeVoter} onNavigate={navigate} onLogout={handleLogout} />
  } else {
    let screen
    if (page === 'contact') {
      screen = <ContactPage onNavigate={navigate} onBack={() => navigate('dashboard')} />
    } else if (page === 'sop') {
      screen = (
        <SopPage
          onNavigate={navigate}
          voter={activeVoter}
          sopAgreed={sopAgreed}
          onAgreeSop={handleAgreeSop}
        />
      )
    } else if (page === 'voteAI') {
      screen = (
        <VotingPage
          key="voteAI"
          type="ai"
          selections={selections}
          onSelect={handleSelect}
          onNext={() => navigate('voteKabem')}
          onBack={() => navigate('sop')}
        />
      )
    } else if (page === 'voteKabem') {
      screen = (
        <VotingPage
          key="voteKabem"
          type="kabem"
          selections={selections}
          onSelect={handleSelect}
          onNext={() => navigate('review')}
          onBack={() => navigate('voteAI')}
        />
      )
    } else if (page === 'review') {
      screen = (
        <ReviewOtpPage
          voter={activeVoter}
          selections={selections}
          onBack={() => navigate('voteKabem')}
          onEdit={navigate}
          onSendOtp={handleSendOtp}
          onSubmit={handleFinalSubmit}
        />
      )
    } else {
      screen = (
        <DashboardPage
          voter={activeVoter}
          stats={stats}
          statsReady={statsReady}
          onNavigate={navigate}
        />
      )
    }

    if (page === 'voteAI' || page === 'voteKabem' || page === 'review') {
      screen = <BallotPrivacyShield voter={activeVoter}>{screen}</BallotPrivacyShield>
    }

    content = (
      <div className="min-h-screen bg-bean pb-20 md:pb-0">
        <TopNav current={page} onNavigate={navigate} onLogout={handleLogout} voter={activeVoter} />
        <main>{screen}</main>
      </div>
    )
  }

  return (
    <>
      {content}
      <ToastNotification toast={toast} onClose={closeToast} />
    </>
  )
}
