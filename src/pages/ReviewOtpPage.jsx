import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Headphones, Lock, Mail, Pencil, ShieldCheck, Timer } from 'lucide-react'
import { CandidatePhoto, Spinner, Stepper } from '../components/SharedUI'
import { OTP_RESEND_SECONDS, OTP_TTL_SECONDS } from '../config'
import { useElection } from '../context/electionContext'
import { formatCountdown, maskEmail } from '../utils/format'

const OTP_LENGTH = 6
const EMPTY_DIGITS = Array.from({ length: OTP_LENGTH }, () => '')

function MaskedSummaryRow({ label, onEdit }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-amber-200/70 bg-amber-50/60 p-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-amber-200 bg-amber-100/70 text-brand/70">
        <EyeOff className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
        <p className="mt-0.5 select-none text-base font-extrabold tracking-widest text-ink/50">
          &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
        </p>
        <p className="text-xs font-medium text-ink-soft">
          Disembunyikan untuk menjaga kerahasiaan pilihan
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 px-3 text-sm font-bold text-brand transition-colors hover:bg-amber-100"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" /> Ubah
      </button>
    </div>
  )
}

function SummaryRow({ label, candidate, onEdit }) {
  if (!candidate) return null
  return (
    <div className="flex items-center gap-4 rounded-xl border border-amber-200/70 bg-amber-50/60 p-4">
      {!candidate.isKotakKosong && (
        <CandidatePhoto
          src={candidate.photo}
          className="h-16 w-16 shrink-0 rounded-xl border border-amber-200 object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
        <p className="truncate text-lg font-extrabold text-ink">{candidate.name}</p>
        {candidate.isKotakKosong ? (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{candidate.tagline}</p>
        ) : (
          <p className="text-sm font-semibold text-brand">Nomor Urut {candidate.number}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 px-3 text-sm font-bold text-brand transition-colors hover:bg-amber-100"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" /> Ubah
      </button>
    </div>
  )
}

export default function ReviewOtpPage({ voter, selections, onBack, onEdit, onSendOtp, onSubmit }) {
  const { getCandidate } = useElection()
  const [digits, setDigits] = useState(EMPTY_DIGITS)
  const [otpSent, setOtpSent] = useState(false)
  const [expiresAt, setExpiresAt] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(0)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const inputRefs = useRef([])
  const usedCodesRef = useRef(new Set())

  // Hanya tampil saat tombol ditahan; langsung sembunyi saat dilepas, multi-sentuh, atau keluar fokus.
  useEffect(() => {
    if (!showSummary) return undefined
    const hide = () => setShowSummary(false)
    const handleMultiTouch = (e) => {
      if ((e.touches?.length || 0) > 1) hide()
    }
    window.addEventListener('pointerup', hide)
    window.addEventListener('pointercancel', hide)
    window.addEventListener('mouseup', hide)
    window.addEventListener('touchend', hide)
    window.addEventListener('touchcancel', hide)
    window.addEventListener('touchstart', handleMultiTouch, { passive: true })
    window.addEventListener('blur', hide)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('pointerup', hide)
      window.removeEventListener('pointercancel', hide)
      window.removeEventListener('mouseup', hide)
      window.removeEventListener('touchend', hide)
      window.removeEventListener('touchcancel', hide)
      window.removeEventListener('touchstart', handleMultiTouch)
      window.removeEventListener('blur', hide)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [showSummary])

  // Detak 1 detik untuk hitung mundur OTP & jeda kirim ulang.
  useEffect(() => {
    if (!otpSent) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [otpSent])

  const remaining = otpSent ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const expired = otpSent && remaining === 0
  const code = digits.join('')
  const canSubmit = otpSent && !expired && code.length === OTP_LENGTH && !submitting

  const focusInput = (index) => {
    const el = inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]
    el?.focus()
    el?.select()
  }

  const fillFrom = (start, text) => {
    const chars = text.replace(/\D/g, '').slice(0, OTP_LENGTH - start).split('')
    if (chars.length === 0) return
    setDigits((prev) => {
      const next = [...prev]
      chars.forEach((ch, i) => {
        next[start + i] = ch
      })
      return next
    })
    focusInput(start + chars.length)
  }

  const handleChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '')
    if (!cleaned) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)))
      return
    }
    // Kotak sudah berisi 1 digit lalu diketik lagi: ambil digit terbaru saja.
    const incoming = cleaned.length === 2 && digits[index] ? cleaned.slice(-1) : cleaned
    fillFrom(index, incoming)
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      setDigits((prev) => prev.map((d, i) => (i === index - 1 ? '' : d)))
      focusInput(index - 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusInput(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusInput(index + 1)
    } else if (event.key === 'Enter' && canSubmit) {
      handleSubmit()
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    fillFrom(0, event.clipboardData.getData('text'))
  }

  const handleSend = async () => {
    if (sending || cooldownLeft > 0) return
    setShowSummary(false)
    setSending(true)
    setError('')
    try {
      await onSendOtp()
      // eslint-disable-next-line react-hooks/purity -- dipanggil di dalam async event handler, bukan saat render
      const t = Date.now()
      setNow(t)
      setExpiresAt(t + OTP_TTL_SECONDS * 1000)
      setCooldownUntil(t + OTP_RESEND_SECONDS * 1000)
      setDigits(EMPTY_DIGITS)
      setOtpSent(true)
      setTimeout(() => focusInput(0), 50)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (usedCodesRef.current.has(code)) {
      setError('Kode OTP ini sudah pernah digunakan. Silakan kirim ulang kode OTP baru.')
      setDigits(EMPTY_DIGITS)
      setShakeKey((k) => k + 1)
      setTimeout(() => focusInput(0), 50)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(code)
      usedCodesRef.current.add(code)
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase()
      if (msg.includes('sudah terpakai') || msg.includes('sudah digunakan')) {
        usedCodesRef.current.add(code)
        setOtpSent(false)
        setExpiresAt(0)
      }
      setError(err.message)
      setDigits(EMPTY_DIGITS)
      setShakeKey((k) => k + 1)
      setSubmitting(false)
      setTimeout(() => focusInput(0), 50)
    }
  }

  return (
    <div className="mx-auto max-w-7xl animate-rise px-4 py-8 lg:px-8 lg:py-10">
      <div className="rounded-2xl border border-gold/25 bg-card-dark/70 p-4 sm:p-6">
        <Stepper step={4} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section
          aria-labelledby="review-title"
          className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40"
        >
          <div className="bg-brand px-6 py-5 text-white">
            <h1 id="review-title" className="text-2xl font-extrabold">
              Review &amp; Verifikasi
            </h1>
            <p className="mt-1 text-sm font-medium text-white/85">
              Periksa pilihan Anda, lalu verifikasi dengan kode OTP.
            </p>
          </div>

          <div className="space-y-8 p-6 text-ink">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-brand">Ringkasan Pilihan</h2>
                  <p className="text-xs text-ink-soft">
                    Tekan dan tahan tombol untuk melihat pilihan; lepaskan untuk menyembunyikan.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-summary"
                  aria-pressed={showSummary}
                  onPointerDown={(e) => {
                    if (e.pointerType !== 'mouse' || e.button === 0) {
                      e.preventDefault()
                      setShowSummary(true)
                    }
                  }}
                  onPointerUp={() => setShowSummary(false)}
                  onPointerCancel={() => setShowSummary(false)}
                  onPointerLeave={() => setShowSummary(false)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      setShowSummary(true)
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setShowSummary(false)
                    }
                  }}
                  onBlur={() => setShowSummary(false)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`inline-flex h-9 touch-none select-none items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors ${
                    showSummary
                      ? 'border-brand bg-brand text-white'
                      : 'border-brand/35 bg-amber-50 text-brand hover:bg-amber-100'
                  }`}
                >
                  {showSummary ? (
                    <>
                      <Eye className="h-4 w-4" aria-hidden="true" /> Lepas untuk Sembunyikan
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" aria-hidden="true" /> Tahan Lihat Pilihan
                    </>
                  )}
                </button>
              </div>
              {[
                {
                  key: 'ai',
                  label: 'Anggota Independen (AI)',
                  candidate: getCandidate(selections.aiId),
                  step: 'voteAI',
                },
                {
                  key: 'kabem',
                  label: 'Ketua & Wakil Ketua BEM',
                  candidate: getCandidate(selections.kabemId),
                  step: 'voteKabem',
                },
              ].map(({ key, label, candidate, step }) => {
                if (!candidate) return null
                return showSummary ? (
                  <SummaryRow
                    key={key}
                    label={label}
                    candidate={candidate}
                    onEdit={() => onEdit(step)}
                  />
                ) : (
                  <MaskedSummaryRow key={key} label={label} onEdit={() => onEdit(step)} />
                )
              })}
            </div>

            <div className="space-y-4 border-t border-amber-200/70 pt-6">
              <h2 className="text-lg font-bold text-brand">Verifikasi OTP</h2>
              <p className="text-sm text-ink-soft">
                Kode 6 digit akan dikirim ke email terdaftar{' '}
                <strong className="text-ink">{maskEmail(voter.email)}</strong>. Kode berlaku{' '}
                3 menit ({OTP_TTL_SECONDS} detik) dan hanya dapat dipakai sekali.
              </p>

              <button
                type="button"
                id="btn-send-otp"
                onClick={handleSend}
                disabled={sending || cooldownLeft > 0}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
              >
                {sending ? (
                  <>
                    <Spinner /> Mengirim kode…
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" aria-hidden="true" />
                    {!otpSent
                      ? 'Kirim Kode OTP'
                      : cooldownLeft > 0
                        ? `Kirim ulang dalam ${cooldownLeft} dtk`
                        : 'Kirim Ulang Kode OTP'}
                  </>
                )}
              </button>

              <fieldset disabled={!otpSent || submitting} className="min-w-0">
                <legend className="mb-3 text-sm font-semibold text-ink">Masukkan 6 digit kode OTP</legend>
                <div
                  key={shakeKey}
                  className={`flex justify-between gap-2 sm:justify-start sm:gap-3 ${
                    shakeKey > 0 ? 'animate-shake' : ''
                  }`}
                  onPaste={handlePaste}
                >
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el
                      }}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={OTP_LENGTH}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Digit OTP ke-${index + 1}`}
                      className="h-14 w-full max-w-12 rounded-xl border-2 border-stone-300 bg-cream text-center text-2xl font-extrabold text-ink transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50 sm:h-16 sm:max-w-14"
                    />
                  ))}
                </div>
              </fieldset>

              {otpSent && (
                <p
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    expired ? 'text-brand' : 'text-ink-soft'
                  }`}
                  aria-live="polite"
                >
                  <Timer className="h-4 w-4" aria-hidden="true" />
                  {expired
                    ? 'Kode kedaluwarsa. Silakan kirim ulang kode OTP.'
                    : `Kode berlaku ${formatCountdown(remaining)} lagi`}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-brand/40 bg-brand/10 p-3 text-sm font-semibold text-brand"
                >
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-amber-200/70 pt-6 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={onBack}
                disabled={submitting}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-brand/40 px-5 text-sm font-bold text-brand transition-colors hover:bg-amber-50 disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali
              </button>
              <button
                type="button"
                id="btn-submit-vote"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Spinner /> Mengunci suara…
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" aria-hidden="true" /> Kunci &amp; Kirim Suara
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gold/25 bg-card-dark p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gold">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Jaminan Kerahasiaan
            </h2>
            <ul className="mt-3 space-y-3 text-sm text-gold/80">
              <li>Suara disimpan di kotak suara tanpa NPM, email, atau nama Anda.</li>
              <li>Kode OTP dibuat dan diperiksa di server, tidak pernah tampil di layar.</li>
              <li>Setelah dikirim, suara tidak dapat diubah maupun dibatalkan.</li>
            </ul>
          </div>
          <div className="rounded-2xl border-l-4 border-brand bg-gold p-5 text-card-dark">
            <p className="font-extrabold">Pemilih</p>
            <p className="mt-1 text-sm font-semibold">{voter.nama}</p>
            <p className="font-mono text-xs">{voter.npm}</p>
          </div>
          <div className="rounded-2xl border border-gold/25 bg-card-dark p-4 text-xs">
            <h3 className="flex items-center gap-1.5 font-bold text-gold">
              <Headphones className="h-4 w-4 text-accent" aria-hidden="true" />
              Kendala Menerima OTP?
            </h3>
            <p className="mt-1.5 text-gold/80 leading-relaxed">
              Jika kode OTP tidak masuk ke folder Utama maupun Spam, hubungi narahubung Panitia.
            </p>
            <button
              type="button"
              onClick={() => onEdit?.('contact')}
              className="mt-2.5 font-bold text-accent transition-colors hover:text-gold hover:underline"
            >
              Lihat 5 Kontak Narahubung &rarr;
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
