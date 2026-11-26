import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  PhoneCall,
  ScrollText,
  UserRound,
  Vote,
  X,
} from 'lucide-react'
import { useElection } from '../context/electionContext'

/* -------------------------------------------------------------------------- */
/* Logo & Spinner                                                             */
/* -------------------------------------------------------------------------- */

export function BrandLogo({ size = 'md', subtitle }) {
  const { appName } = useElection()
  const isLarge = size === 'lg'
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative grid shrink-0 place-items-center rounded-xl bg-card-dark/70 p-1 border border-gold/25 shadow-lg shadow-black/30 backdrop-blur-sm ${
          isLarge ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-11 w-11 sm:h-12 sm:w-12'
        }`}
      >
        <img
          src="/images/logo.png"
          alt={appName}
          className="h-full w-full object-contain drop-shadow select-none"
        />
      </div>
      <div className="leading-tight">
        <p
          className={`font-extrabold tracking-wide text-gold ${isLarge ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}
        >
          {appName}
        </p>
        {subtitle && <p className="text-xs font-medium text-gold/60">{subtitle}</p>}
      </div>
    </div>
  )
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />
}

/** Foto kandidat dengan placeholder bila `src` kosong atau gagal dimuat. */
export function CandidatePhoto({ src, alt = '', className = '' }) {
  const [failedSrc, setFailedSrc] = useState('')
  if (!src || failedSrc === src) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={`grid place-items-center bg-gradient-to-br from-card-dark to-brand/60 text-gold/70 ${className}`}
      >
        <UserRound className="h-1/2 w-1/2 max-h-16 max-w-16" aria-hidden="true" />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} className={className} />
}

/* -------------------------------------------------------------------------- */
/* Top Navbar (desktop) + Bottom Tab Bar (mobile)                             */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS_DEFAULT = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, matches: ['dashboard'] },
  { id: 'sop', label: 'SOP', icon: ScrollText, matches: ['sop'] },
  { id: 'voting', label: 'Voting', icon: Vote, matches: ['voting', 'voteAI', 'voteKabem', 'review'], isCta: true },
  { id: 'contact', label: 'Narahubung', icon: PhoneCall, matches: ['contact'] },
]

const NAV_ITEMS_VOTED = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, matches: ['dashboard'] },
  { id: 'sop', label: 'SOP Pemilihan', icon: ScrollText, matches: ['sop'] },
  { id: 'contact', label: 'Narahubung', icon: PhoneCall, matches: ['contact'] },
]

export function TopNav({ current, onNavigate, onLogout, voter }) {
  const items = voter?.hasVoted ? NAV_ITEMS_VOTED : NAV_ITEMS_DEFAULT

  return (
    <>
      <header className="sticky top-0 z-40 h-[72px] border-b border-gold/12 bg-bean/95 backdrop-blur md:h-[76px]">
        <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="rounded-lg focus-visible:outline-gold"
            aria-label="Kembali ke Dashboard"
          >
            <BrandLogo />
          </button>

          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-1.5 md:absolute md:left-1/2 md:-translate-x-1/2 md:flex lg:gap-2"
          >
            {items.map(({ id, label, icon: Icon, matches, isCta }) => {
              const active = matches.includes(current)
              const buttonClass = isCta
                ? `flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold via-amber-300 to-accent px-5 py-2.5 text-sm font-extrabold text-card-dark shadow-lg shadow-accent/40 ring-2 transition-all hover:brightness-110 hover:scale-105 ${
                    active ? 'ring-white scale-105 shadow-xl shadow-gold/50' : 'ring-gold/80'
                  }`
                : `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors lg:px-4 ${
                    active
                      ? 'bg-brand text-white shadow-lg shadow-brand/30'
                      : 'text-gold/80 hover:bg-gold/10 hover:text-gold'
                  }`
              return (
                <button
                  key={id}
                  type="button"
                  id={`nav-${id}`}
                  onClick={() => onNavigate(id)}
                  aria-current={active ? 'page' : undefined}
                  className={buttonClass}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
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
          items.length === 2
            ? 'grid-cols-2'
            : items.length === 3
              ? 'grid-cols-3'
              : items.length === 4
                ? 'grid-cols-4'
                : 'grid-cols-5'
        }`}
      >
        {items.map(({ id, label, icon: Icon, matches, isCta }) => {
          const active = matches.includes(current)
          if (isCta) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={active ? 'page' : undefined}
                className={`my-1 mx-1 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-r from-gold via-amber-300 to-accent text-[11px] font-extrabold text-card-dark shadow-md shadow-accent/30 ring-1 transition-all ${
                  active ? 'ring-white brightness-110' : 'ring-gold/80'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            )
          }
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
  { id: 1, label: 'SOP Pemilihan' },
  { id: 2, label: 'Pilih AI' },
  { id: 3, label: 'Pilih Kabem' },
  { id: 4, label: 'Review & OTP' },
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
        <CandidatePhoto
          src={candidate.photo}
          alt={`Foto ${candidate.name}`}
          className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-105"
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

export function KotakKosongCard({ option, selected, onChoose, className = '' }) {
  return (
    <article
      className={`relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl border bg-white p-6 shadow-2xl shadow-black/40 transition-all duration-300 sm:flex-row sm:items-center ${
        selected
          ? 'border-gold ring-4 ring-gold/70 -translate-y-1'
          : 'border-amber-200/50 hover:-translate-y-1'
      } ${className}`}
      aria-label={option.name}
    >
      {selected && (
        <span className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-extrabold text-card-dark shadow-lg">
          <Check className="h-4 w-4" aria-hidden="true" />
          Pilihan Anda
        </span>
      )}

      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-dashed transition-colors ${
            selected ? 'border-brand bg-amber-50' : 'border-stone-300 bg-cream'
          }`}
        >
          <div className="h-7 w-7 rounded-md border-2 border-dashed border-ink-soft/40" />
        </div>
        <div className={`min-w-0 ${selected ? 'pr-24 sm:pr-28' : ''}`}>
          <h3 className="text-xl font-extrabold leading-snug text-ink">{option.name}</h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{option.tagline}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChoose(option)}
        aria-pressed={selected}
        className={`flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors sm:min-w-48 ${
          selected ? 'bg-card-dark' : 'bg-brand hover:bg-brand-hover'
        }`}
      >
        {selected ? (
          <>
            <Check className="h-4 w-4 text-gold" aria-hidden="true" /> Terpilih
          </>
        ) : (
          'Pilih Kotak Kosong'
        )}
      </button>
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

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-modal-title"
        className="flex max-h-[88dvh] w-full max-w-2xl animate-modal-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/60"
      >
        <div className="flex shrink-0 items-center gap-4 bg-brand px-5 py-4 text-white">
          <span className="shrink-0 rounded-lg bg-white px-3 py-1 text-lg font-extrabold text-brand">
            {candidate.number}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Visi &amp; Misi
            </p>
            <h2 id="candidate-modal-title" className="text-base font-extrabold leading-snug sm:text-xl">
              {candidate.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 transition-colors hover:bg-white/15"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 text-ink sm:p-6">
          <div className="flex items-center gap-4">
            <CandidatePhoto
              src={candidate.photo}
              className="h-20 w-20 shrink-0 rounded-xl border border-amber-200 object-cover object-top"
            />
            <div className="min-w-0">
              <p className="font-bold text-brand">{candidate.role}</p>
              <p className="text-sm text-ink-soft break-words">{candidate.study}</p>
            </div>
          </div>

          <section>
            <h3 className="mb-2 text-lg font-bold text-brand">Visi</h3>
            <blockquote className="break-words whitespace-pre-line rounded-xl border-l-4 border-brand bg-amber-50 p-4 text-base font-medium italic">
              “{candidate.visi}”
            </blockquote>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-bold text-brand">Misi</h3>
            <ol className="space-y-2.5">
              {candidate.misi.map((item, index) => (
                <li key={`${index}-${item}`} className="flex gap-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 break-words whitespace-pre-line pt-0.5 text-ink-soft">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {candidate.type === 'kabem' && candidate.programs.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-bold text-brand">Program Prioritas</h3>
              <ul className="flex flex-wrap gap-2">
                {candidate.programs.map((program, index) => (
                  <li
                    key={`${index}-${program}`}
                    className="break-words rounded-full border border-brand/30 bg-amber-50 px-3 py-1 text-xs font-bold text-brand"
                  >
                    {program}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-amber-200/60 bg-white p-4">
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
    </div>,
    document.body,
  )
}
