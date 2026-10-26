import { useEffect, useState } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { Spinner } from '../../components/SharedUI'
import { btnDanger, btnGhost, btnPrimary, inputSingle } from './styles'

/** Kartu panel dengan judul, deskripsi, dan slot aksi di kanan atas. */
export function Card({ title, description, icon: Icon, actions, tone = 'default', children }) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${
        tone === 'danger' ? 'border-red-500/40 bg-red-950/30' : 'border-gold/25 bg-card-dark'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gold">
            {Icon && <Icon className={`h-5 w-5 ${tone === 'danger' ? 'text-red-400' : ''}`} aria-hidden="true" />}
            {title}
          </h2>
          {description && <p className="mt-1 max-w-2xl text-sm text-gold/70">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function Field({ label, htmlFor, hint, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-gold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gold/55">{hint}</p>}
    </div>
  )
}

/** Bilah simpan yang melekat di bawah saat ada perubahan belum tersimpan. */
export function SaveBar({ dirty, saving, onSave, onDiscard, saveLabel = 'Simpan Perubahan' }) {
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-bean/95 p-3 shadow-2xl shadow-black/50 backdrop-blur sm:px-5">
      <p className={`text-sm font-semibold ${dirty ? 'text-accent' : 'text-gold/60'}`} aria-live="polite">
        {dirty ? 'Ada perubahan yang belum disimpan.' : 'Semua perubahan sudah tersimpan.'}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onDiscard} disabled={!dirty || saving} className={btnGhost}>
          Batalkan
        </button>
        <button type="button" onClick={onSave} disabled={!dirty || saving} className={btnPrimary}>
          {saving && <Spinner className="h-4 w-4" />} {saveLabel}
        </button>
      </div>
    </div>
  )
}

function DialogBody({
  title,
  message,
  children,
  confirmLabel,
  requireText,
  danger,
  busy,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState('')
  const locked = Boolean(requireText) && typed.trim() !== requireText

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [busy, onCancel])

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md animate-modal-in rounded-2xl border border-gold/30 bg-card-dark p-6 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              danger ? 'bg-red-700 text-white' : 'bg-gold text-card-dark'
            }`}
          >
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-lg font-bold text-gold">
              {title}
            </h2>
            {message && <p className="mt-1 text-sm text-gold/80">{message}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1 text-gold/60 transition-colors hover:bg-gold/10 hover:text-gold disabled:opacity-40"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children && <div className="mt-4 text-sm text-gold/80">{children}</div>}

        {requireText && (
          <div className="mt-4">
            <label htmlFor="confirm-typed" className="mb-1.5 block text-xs font-semibold text-gold/80">
              Ketik <strong className="font-mono text-gold">{requireText}</strong> untuk melanjutkan
            </label>
            <input
              id="confirm-typed"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              disabled={busy}
              className={inputSingle}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={btnGhost}>
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || locked}
            className={danger ? btnDanger : btnPrimary}
          >
            {busy && <Spinner className="h-4 w-4" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, confirmLabel = 'Ya, lanjutkan', ...rest }) {
  if (!open) return null
  return <DialogBody confirmLabel={confirmLabel} {...rest} />
}
