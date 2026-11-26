import { useEffect, useState } from 'react'
import { EyeOff, ShieldAlert } from 'lucide-react'

/**
 * Lapisan perlindungan privasi bilik suara (pemilihan kandidat & review OTP):
 *  - Memblokir klik kanan, seret gambar, salin teks, cetak (Ctrl+P / PDF), dan pintasan capture browser.
 *  - Menyamarkan layar otomatis saat jendela kehilangan fokus / PrintScreen ditekan.
 *  - Menampilkan watermark diagonal identitas pemilih agar tangkapan layar tidak dapat disalahgunakan.
 * Catatan: input & paste OTP tetap diizinkan agar verifikasi kode 6 digit tidak terganggu.
 */
export default function BallotPrivacyShield({ voter, children }) {
  const [shielded, setShielded] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    document.body.classList.add('ballot-print-protected')
    let timer = null

    const lockTemporarily = (msg) => {
      setNotice(msg)
      setShielded(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (!document.hidden && document.hasFocus()) {
          setShielded(false)
          setNotice('')
        }
      }, 2500)
    }

    const handleKey = (e) => {
      const key = String(e.key || '').toLowerCase()
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault()
        navigator.clipboard?.writeText?.('').catch(() => {})
        lockTemporarily('Tangkapan layar (PrintScreen) dinonaktifkan pada halaman ini.')
        return
      }
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u', 'c'].includes(key)) {
        // Izinkan Ctrl+V untuk menempel kode OTP, blokir cetak/simpan/salin/screenshot browser.
        e.preventDefault()
        if (e.shiftKey && key === 's') {
          lockTemporarily('Pintasan tangkapan layar dinonaktifkan untuk menjaga kerahasiaan suara.')
        }
        return
      }
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(key)) {
        e.preventDefault()
        lockTemporarily('Pintasan tangkapan layar dinonaktifkan untuk menjaga kerahasiaan suara.')
      }
    }

    const blockAction = (e) => {
      e.preventDefault()
    }

    const handleBlur = () => {
      setNotice('Halaman bilik suara disamarkan saat tidak aktif untuk menjaga kerahasiaan pilihan.')
      setShielded(true)
    }

    const handleFocus = () => {
      if (!document.hidden) {
        setShielded(false)
        setNotice('')
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        handleBlur()
      } else if (document.hasFocus()) {
        handleFocus()
      }
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKey)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('contextmenu', blockAction)
    document.addEventListener('copy', blockAction)
    document.addEventListener('cut', blockAction)
    document.addEventListener('dragstart', blockAction)

    return () => {
      document.body.classList.remove('ballot-print-protected')
      if (timer) clearTimeout(timer)
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKey)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('contextmenu', blockAction)
      document.removeEventListener('copy', blockAction)
      document.removeEventListener('cut', blockAction)
      document.removeEventListener('dragstart', blockAction)
    }
  }, [])

  const wmText = `DILARANG SCREENSHOT • PEMIRA IKM FIK UI 2026${voter?.npm ? ` • ${voter.npm}` : ''}`

  return (
    <div className="ballot-protected relative">
      {/* Watermark diagonal halus agar tangkapan layar tetap tertandai */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden opacity-[0.07]"
      >
        <svg className="h-full w-full">
          <defs>
            <pattern
              id="ballot-watermark-pattern"
              width="420"
              height="180"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-24)"
            >
              <text
                x="10"
                y="90"
                fill="#E8C580"
                fontSize="13"
                fontWeight="700"
                fontFamily="Plus Jakarta Sans, Arial, sans-serif"
                letterSpacing="1.5"
              >
                {wmText}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ballot-watermark-pattern)" />
        </svg>
      </div>

      {/* Konten halaman bilik suara */}
      <div className={`ballot-screen-content transition-all duration-150 ${shielded ? 'pointer-events-none select-none blur-xl' : ''}`}>
        {children}
      </div>

      {/* Tirai privasi ketika jendela kehilangan fokus / PrintScreen */}
      {shielded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-shield-title"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-bean/95 p-6 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-card-dark p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/20 text-accent">
              <EyeOff className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 id="privacy-shield-title" className="mt-4 text-xl font-extrabold text-gold">
              Privasi Bilik Suara Aktif
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gold/80">
              {notice ||
                'Demi menjaga asas kerahasiaan suara, tangkapan layar, salin teks, dan pencetakan halaman tidak diperbolehkan.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setShielded(false)
                setNotice('')
              }}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Lanjutkan Memilih
            </button>
          </div>
        </div>
      )}

      {/* Tampilan khusus saat pengguna mencoba mencetak / Save as PDF */}
      <div className="ballot-print-warning hidden p-10 text-center text-black">
        <p className="text-xl font-bold">Pencetakan Bilik Suara Ditolak</p>
        <p className="mt-2 text-sm">
          Demi menjaga kerahasiaan pilihan pada PEMIRA IKM FIK UI 2026, halaman ini tidak dapat dicetak atau disimpan sebagai PDF.
        </p>
      </div>
    </div>
  )
}
