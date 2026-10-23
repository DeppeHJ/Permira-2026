import { useEffect, useRef } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Crown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { APP_NAME } from '../data'

/* -------------------------------------------------------------------------- */
/* Logo & Spinner                                                             */
/* -------------------------------------------------------------------------- */

export function BrandLogo({ size = 'md', subtitle }) {
  const isLarge = size === 'lg'
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-gold text-card-dark shadow-lg shadow-black/30 ${
          isLarge ? 'h-14 w-14' : 'h-10 w-10'
        }`}
      >
        <ShieldCheck className={isLarge ? 'h-8 w-8' : 'h-6 w-6'} aria-hidden="true" />
      </span>
      <div className="leading-tight">
        <p
          className={`font-extrabold tracking-wide text-gold ${isLarge ? 'text-3xl' : 'text-xl'}`}
        >
          {APP_NAME}
        </p>
        {subtitle && <p className="text-xs font-medium text-gold/60">{subtitle}</p>}
      </div>
    </div>
  )
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />
}

/* -------------------------------------------------------------------------- */
/* Top Navbar (desktop) + Bottom Tab Bar (mobile)                             */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS_DEFAULT = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, matches: ['dashboard'] },
  { id: 'voteAI', label: 'Voting AI', icon: Users, matches: ['voteAI'] },
  { id: 'voteKabem', label: 'Voting Kabem', icon: Crown, matches: ['voteKabem', 'review'] },
  { id: 'sop', label: 'SOP', icon: ScrollText, matches: ['sop'] },
]

const NAV_ITEMS_VOTED = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, matches: ['dashboard'] },
  { id: 'sop', label: 'SOP Pemilihan', icon: ScrollText, matches: ['sop'] },
]

export function TopNav({ current, onNavigate, onLogout, voter }) {
  const items = voter?.hasVoted ? NAV_ITEMS_VOTED : NAV_ITEMS_DEFAULT

  return (
    <>
      <header className="sticky top-0 z-40 h-[72px] border-b border-gold/12 bg-bean/95 backdrop-blur md:h-[76px]">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="rounded-lg focus-visible:outline-gold"
            aria-label="Kembali ke Dashboard"
          >
            <BrandLogo />
          </button>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-2 md:flex">
            {items.map(({ id, label, icon: Icon, matches }) => {
              const active = matches.includes(current)
              return (
                <button
                  key={id}
                  type="button"
                  id={`nav-${id}`}
                  onClick={() => onNavigate(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-brand text-white shadow-lg shadow-brand/30'
                      : 'text-gold/80 hover:bg-gold/10 hover:text-gold'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            {voter && (
              <div className="hidden text-right leading-tight lg:block">
                <p className="max-w-48 truncate text-sm font-semibold text-gold">{voter.nama}</p>
                <p className="font-mono text-xs text-gold/60">{voter.npm}</p>
              </div>
            )}
            <button
              type="button"
              id="btn-logout"
              onClick={onLogout}
              className="flex h-11 items-center gap-2 rounded-xl border border-gold/25 px-4 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-card-dark"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
              <span className="sr-only sm:hidden">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom tab bar khusus mobile */}
      <nav
        aria-label="Navigasi bawah"
        className={`fixed inset-x-0 bottom-0 z-40 grid h-16 border-t border-gold/15 bg-bean/95 backdrop-blur md:hidden ${
          items.length === 2 ? 'grid-cols-2' : 'grid-cols-4'
        }`}
      >
        {items.map(({ id, label, icon: Icon, matches }) => {
          const active = matches.includes(current)
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                active ? 'text-gold' : 'text-gold/50'
              }`}
            >
              <span
                className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                  active ? 'bg-brand text-white' : ''
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {label}
            </button>
          )
        })}
      </nav>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Stepper                                                                    */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { id: 1, label: 'Voting AI' },
  { id: 2, label: 'Voting Kabem' },
  { id: 3, label: 'Verifikasi & Selesai' },
]

export function Stepper({ step }) {
  return (
    <ol className="flex w-full items-center" aria-label="Tahapan pemilihan">
      {STEPS.map((item, index) => {
        const state = item.id < step ? 'done' : item.id === step ? 'active' : 'upcoming'
        return (
          <li
            key={item.id}
            className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-extrabold transition-all sm:h-10 sm:w-10 ${
                  state === 'done'
                    ? 'border-gold bg-card-dark text-gold'
                    : state === 'active'
                      ? 'border-brand bg-brand text-white shadow-lg shadow-brand/50 ring-4 ring-brand/25'
                      : 'border-gold/15 bg-card-dark/40 text-gold/40'
                }`}
              >
                {state === 'done' ? <Check className="h-5 w-5" aria-hidden="true" /> : item.id}
              </span>
              <span
                className={`hidden text-sm font-semibold sm:block ${
                  state === 'done' ? 'text-gold' : state === 'active' ? 'text-white' : 'text-gold/40'
                }`}
              >
                {item.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span
                className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-4 ${
                  item.id < step ? 'bg-gold' : 'bg-gold/15'
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/* Toast Notification                                                         */
/* -------------------------------------------------------------------------- */

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  mail: Mail,
  info: BadgeCheck,
}

export function ToastNotification({ toast, onClose }) {
  const toastId = toast?.id
  const duration = toast?.duration ?? 5000

  useEffect(() => {
    if (!toastId) return undefined
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [toastId, duration, onClose])

  if (!toast) return null
  const Icon = TOAST_ICONS[toast.type] || BadgeCheck
  const isError = toast.type === 'error'

  return (
    <div
      className="pointer-events-none fixed inset-x-4 top-20 z-[60] flex justify-end md:top-24"
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div
        key={toast.id}
        role={isError ? 'alert' : 'status'}
        className="pointer-events-auto relative w-full max-w-sm animate-toast-in overflow-hidden rounded-2xl border border-gold/30 bg-card-dark p-4 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              isError ? 'bg-brand text-white' : 'bg-gold text-card-dark'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gold">{toast.title}</p>
            {toast.message && <p className="mt-0.5 text-sm text-gold/80">{toast.message}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gold/60 transition-colors hover:bg-gold/10 hover:text-gold"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <span
          className="absolute bottom-0 left-0 h-1 animate-shrink bg-gold/70"
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Kartu Kandidat                                                             */
/* -------------------------------------------------------------------------- */

export function CandidateCard({ candidate, selected, onShowDetail, onChoose }) {
  const isPair = candidate.type === 'kabem'
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-black/40 transition-all duration-300 ${
        selected
          ? 'border-gold ring-4 ring-gold/70 -translate-y-1'
          : 'border-amber-200/50 hover:-translate-y-1'
      }`}
      aria-label={`Kandidat nomor urut ${candidate.number}: ${candidate.name}`}
    >
      <span className="absolute left-4 top-4 z-10 rounded-lg bg-brand px-4 py-1.5 text-lg font-extrabold text-white shadow-lg shadow-black/30">
        {candidate.number}
      </span>
      {selected && (
        <span className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-extrabold text-card-dark shadow-lg">
          <Check className="h-4 w-4" aria-hidden="true" />
          Pilihan Anda
        </span>
      )}

      <div className={`overflow-hidden bg-card-dark ${isPair ? 'aspect-square' : 'aspect-[3/4]'}`}>
        <img
          src={candidate.photo}
          alt={`Foto ${candidate.name}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-xl font-extrabold leading-snug text-ink">{candidate.name}</h3>
          <p className="mt-1 text-sm font-semibold text-brand">{candidate.role}</p>
          <p className="mt-0.5 text-xs text-ink-soft">{candidate.study}</p>
        </div>
        <p className="text-sm italic text-ink-soft">“{candidate.tagline}”</p>

        <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onShowDetail(candidate)}
            className="h-12 rounded-xl border border-brand/40 bg-amber-50 px-3 text-sm font-bold text-brand transition-colors hover:bg-amber-100"
          >
            Lihat Visi &amp; Misi
          </button>
          <button
            type="button"
            onClick={() => onChoose(candidate)}
            aria-pressed={selected}
            className={`flex h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors ${
              selected ? 'bg-card-dark' : 'bg-brand hover:bg-brand-hover'
            }`}
          >
            {selected ? (
              <>
                <Check className="h-4 w-4 text-gold" aria-hidden="true" /> Terpilih
              </>
            ) : (
              'Pilih Kandidat'
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* Modal Visi & Misi                                                          */
/* -------------------------------------------------------------------------- */

export function CandidateModal({ candidate, selected, onClose, onChoose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!candidate) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [candidate, onClose])

  if (!candidate) return null

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-modal-title"
        className="flex max-h-[92vh] w-full max-w-2xl animate-modal-in flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-black/60 sm:rounded-2xl"
      >
        <div className="flex items-center gap-4 bg-brand px-5 py-4 text-white">
          <span className="rounded-lg bg-white px-3 py-1 text-lg font-extrabold text-brand">
            {candidate.number}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Visi &amp; Misi
            </p>
            <h2 id="candidate-modal-title" className="truncate text-lg font-extrabold sm:text-xl">
              {candidate.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-white/15"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-ink">
          <div className="flex items-center gap-4">
            <img
              src={candidate.photo}
              alt=""
              className="h-20 w-20 rounded-xl border border-amber-200 object-cover"
            />
            <div>
              <p className="font-bold text-brand">{candidate.role}</p>
              <p className="text-sm text-ink-soft">{candidate.study}</p>
            </div>
          </div>

          <section>
            <h3 className="mb-2 text-lg font-bold text-brand">Visi</h3>
            <blockquote className="rounded-xl border-l-4 border-brand bg-amber-50 p-4 text-base font-medium italic">
              “{candidate.visi}”
            </blockquote>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-bold text-brand">Misi</h3>
            <ol className="space-y-2.5">
              {candidate.misi.map((item, index) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-ink-soft">{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-bold text-brand">Program Prioritas</h3>
            <ul className="flex flex-wrap gap-2">
              {candidate.programs.map((program) => (
                <li
                  key={program}
                  className="rounded-full border border-brand/30 bg-amber-50 px-3 py-1 text-xs font-bold text-brand"
                >
                  {program}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-amber-200/60 bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border border-brand/40 text-sm font-bold text-brand transition-colors hover:bg-amber-50"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              onChoose(candidate)
              onClose()
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover"
          >
            {selected ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Terpilih
              </>
            ) : (
              'Pilih Kandidat'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
