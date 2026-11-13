import { useState } from 'react'
import { AlertCircle, ArrowLeft, KeyRound, Landmark, Mail, ShieldAlert } from 'lucide-react'
import { BrandLogo, Spinner } from '../components/SharedUI'

export default function AdminLoginPage({ onLogin, loading, error, onBack, variant = 'panitia' }) {
  const isSuper = variant === 'super'
  const TitleIcon = isSuper ? ShieldAlert : Landmark
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!loading) onLogin(email, password)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bean px-4 py-10">
      <img
        src="/images/login-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-sm"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bean/70 to-bean" aria-hidden="true" />

      <section
        aria-labelledby="admin-login-title"
        className="relative z-10 w-full max-w-md animate-rise rounded-2xl border border-gold/25 bg-card-dark p-6 shadow-2xl shadow-black/60 sm:p-8"
      >
        <BrandLogo subtitle={isSuper ? 'Portal Super Admin' : 'Portal Panitia Pemilihan'} />
        <h1 id="admin-login-title" className="mt-6 flex items-center gap-2 text-2xl font-bold text-white">
          <TitleIcon className="h-6 w-6 text-gold" aria-hidden="true" />{' '}
          {isSuper ? 'Masuk Super Admin' : 'Masuk Admin Panitia'}
        </h1>
        <p className="mt-1 text-sm text-gold/70">
          {isSuper
            ? 'Akses khusus pengelola sistem pemilihan.'
            : 'Akses terbatas untuk Panitia yang terdaftar.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-gold">
              Email Admin
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold/50"
                aria-hidden="true"
              />
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isSuper ? 'superadmin@panitia.ac.id' : 'admin@panitia.ac.id'}
                className="h-12 w-full rounded-xl border border-gold/25 bg-bean/60 pl-12 pr-4 text-white placeholder:text-gold/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-gold">
              Kata Sandi
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold/50"
                aria-hidden="true"
              />
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-gold/25 bg-bean/60 pl-12 pr-4 text-white placeholder:text-gold/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
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
            id="btn-admin-login"
            disabled={loading || !email.trim() || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-base font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner /> Memverifikasi…
              </>
            ) : (
              isSuper ? 'Masuk ke Panel Super Admin' : 'Masuk ke Dashboard Panitia'
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 flex items-center gap-2 text-sm font-semibold text-gold/80 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke halaman pemilih
        </button>
      </section>
    </main>
  )
}
