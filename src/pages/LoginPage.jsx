import { useState } from 'react'
import { AlertCircle, ArrowRight, IdCard, LockKeyhole, UserRound } from 'lucide-react'
import { BrandLogo, Spinner } from '../components/SharedUI'
import { useElection } from '../context/electionContext'

export default function LoginPage({ onLogin, loading, error, onGoAdmin, onNavigate }) {
  const { appName } = useElection()
  const [identity, setIdentity] = useState('')
  const [npm, setNpm] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (loading) return
    onLogin({ identity, npm })
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bean px-4 py-10">
      {/* Siluet gedung kampus (blur) */}
      <img
        src="/images/login-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-sm"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-bean/70 via-bean/60 to-bean"
        aria-hidden="true"
      />

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <section className="hidden animate-rise lg:block" aria-label={`Tentang ${appName}`}>
          <BrandLogo size="lg" subtitle="Pemilihan Raya Mahasiswa" />
          <h1 className="mt-8 text-5xl font-extrabold leading-tight text-gold">
            Suara Anda,
            <br />
            Masa Depan Kampus.
          </h1>
          <p className="mt-5 max-w-md text-base font-medium text-gold/80">
            Sistem pemungutan suara online resmi untuk memilih Ketua/Wakil BEM dan Anggota
            Independen. Langsung, umum, bebas, rahasia, jujur, dan adil.
          </p>
          <ul className="mt-8 space-y-3 text-sm font-medium text-gold/90">
            {[
              'Identitas pemilih terpisah dari kotak suara',
              'Verifikasi dua langkah melalui OTP email',
              'Satu pemilih, satu suara',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <LockKeyhole className="h-4 w-4 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="animate-rise rounded-2xl border border-gold/25 bg-card-dark p-6 shadow-2xl shadow-black/60 sm:p-8"
          aria-labelledby="login-title"
        >
          <div className="mb-6 lg:hidden">
            <BrandLogo />
          </div>
          <h2 id="login-title" className="text-2xl font-bold text-white">
            Masuk sebagai Pemilih
          </h2>
          <p className="mt-1 text-sm text-gold/70">
            Gunakan data yang terdaftar pada Daftar Pemilih Tetap (DPT).
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="login-identity" className="mb-2 block text-sm font-semibold text-gold">
                Email atau Nama Lengkap
              </label>
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold/50"
                  aria-hidden="true"
                />
                <input
                  id="login-identity"
                  type="text"
                  autoComplete="off"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="nama@kampus.ac.id"
                  className="h-12 w-full rounded-xl border border-gold/25 bg-bean/60 pl-12 pr-4 text-white placeholder:text-gold/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-npm" className="mb-2 block text-sm font-semibold text-gold">
                NPM
              </label>
              <div className="relative">
                <IdCard
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold/50"
                  aria-hidden="true"
                />
                <input
                  id="login-npm"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={20}
                  value={npm}
                  onChange={(e) => setNpm(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                  placeholder="Nomor Pokok Mahasiswa"
                  className="h-12 w-full rounded-xl border border-gold/25 bg-bean/60 pl-12 pr-4 font-mono text-white placeholder:font-sans placeholder:text-gold/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex animate-shake items-start gap-3 rounded-xl border border-brand bg-brand/20 p-3 text-sm text-gold"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              id="btn-login"
              disabled={loading || !identity.trim() || !npm.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner /> Memeriksa DPT…
                </>
              ) : (
                <>
                  Masuk ke Bilik Suara <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-gold/12 pt-4 text-xs text-gold/60">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate?.('sop')}
                className="font-semibold text-gold/80 transition-colors hover:text-gold hover:underline"
              >
                SOP Pemilihan
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onNavigate?.('contact')}
                className="font-semibold text-gold/80 transition-colors hover:text-gold hover:underline"
              >
                Narahubung (CP)
              </button>
            </div>
            <button
              type="button"
              onClick={onGoAdmin}
              className="font-semibold text-gold underline-offset-4 hover:underline"
            >
              Portal Panitia
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
