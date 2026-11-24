import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { CandidatePhoto, Spinner } from '../../components/SharedUI'
import { CANDIDATE_TYPES, validateCandidateForm } from '../../utils/candidates'
import { fileToCompressedDataUrl } from '../../utils/image'
import { btnGhost, btnPrimary, iconBtn, inputSingle, textareaClass } from './styles'
import { Field } from './ui'

const stripLeadingBullet = (line) =>
  line.replace(/^\s*(?:\d+[.)]\s*|[-•*–—]\s+)/, '').trim()

/**
 * Editor daftar poin (Misi & Program Prioritas): setiap poin tampil dalam kotak bernomor terpisah
 * agar batas antarpoin selalu jelas, mendukung Enter untuk poin baru, geser urutan, serta tempel banyak baris sekaligus.
 */
function PointListEditor({
  idPrefix,
  label,
  addLabel,
  placeholderPrefix,
  hint,
  items,
  multiline = false,
  onChange,
}) {
  const inputRefs = useRef([])
  const list = Array.isArray(items) && items.length > 0 ? items : ['']
  const filledCount = list.filter((item) => item.trim()).length

  const focusRow = (index) => {
    requestAnimationFrame(() => {
      const el = inputRefs.current[index]
      if (el) {
        el.focus()
        const len = el.value.length
        el.setSelectionRange?.(len, len)
      }
    })
  }

  const updateAt = (index, value) => {
    const next = [...list]
    next[index] = value
    onChange(next)
  }

  const insertAfter = (index) => {
    const next = [...list]
    next.splice(index + 1, 0, '')
    onChange(next)
    focusRow(index + 1)
  }

  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= list.length) return
    const next = [...list]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    focusRow(target)
  }

  const removeAt = (index) => {
    if (list.length <= 1) {
      onChange([''])
      focusRow(0)
      return
    }
    const next = list.filter((_, i) => i !== index)
    onChange(next)
    focusRow(Math.max(0, index - 1))
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      insertAfter(index)
    }
  }

  const handlePaste = (index, event) => {
    if (list[index].trim()) return
    const pasted = event.clipboardData?.getData('text') || ''
    if (!/[\r\n]/.test(pasted)) return

    const lines = pasted
      .split(/\r?\n/)
      .map(stripLeadingBullet)
      .filter(Boolean)

    if (lines.length > 1) {
      event.preventDefault()
      const next = [...list]
      next.splice(index, 1, ...lines)
      onChange(next)
      focusRow(index + lines.length - 1)
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`${idPrefix}-0`} className="text-sm font-semibold text-gold">
          {label}
        </label>
        <span className="rounded-full border border-gold/25 bg-bean/60 px-2.5 py-0.5 text-xs font-bold text-gold/80">
          {filledCount} poin terisi
        </span>
      </div>

      <ol className="space-y-2.5">
        {list.map((value, index) => (
          <li
            key={index}
            className="flex items-start gap-2.5 rounded-xl border border-gold/20 bg-bean/45 p-2.5 transition-colors focus-within:border-gold/50"
          >
            <span
              className="mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-white"
              aria-hidden="true"
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              {multiline ? (
                <textarea
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  id={`${idPrefix}-${index}`}
                  rows={2}
                  value={value}
                  onChange={(event) => updateAt(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={(event) => handlePaste(index, event)}
                  placeholder={`${placeholderPrefix} ${index + 1}…`}
                  aria-label={`${label} poin ${index + 1}`}
                  className={`${textareaClass} min-h-[60px] py-2`}
                />
              ) : (
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  id={`${idPrefix}-${index}`}
                  type="text"
                  value={value}
                  onChange={(event) => updateAt(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={(event) => handlePaste(index, event)}
                  placeholder={`${placeholderPrefix} ${index + 1}…`}
                  aria-label={`${label} poin ${index + 1}`}
                  className={inputSingle}
                />
              )}
            </div>

            <div className="mt-1 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className={iconBtn}
                title="Pindahkan ke atas"
                aria-label={`Pindahkan ${label} poin ${index + 1} ke atas`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === list.length - 1}
                className={iconBtn}
                title="Pindahkan ke bawah"
                aria-label={`Pindahkan ${label} poin ${index + 1} ke bawah`}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className={`${iconBtn} hover:border-red-400 hover:bg-red-950/60 hover:text-red-300`}
                title={list.length <= 1 ? 'Kosongkan poin' : 'Hapus poin'}
                aria-label={`Hapus ${label} poin ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => insertAfter(list.length - 1)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gold/30 px-3 text-xs font-bold text-gold transition-colors hover:bg-gold/10"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {addLabel}
        </button>
        {hint && <p className="text-xs text-gold/55">{hint}</p>}
      </div>
    </div>
  )
}

function PhotoField({ value, isPair, onChange, showToast }) {
  const fileRef = useRef(null)
  const [processing, setProcessing] = useState(false)
  const isUploaded = value.startsWith('data:')

  const handleFile = async (file) => {
    if (!file) return
    setProcessing(true)
    try {
      onChange(await fileToCompressedDataUrl(file))
    } catch (error) {
      showToast({ type: 'error', title: 'Foto tidak dapat dipakai', message: error.message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <CandidatePhoto
        src={value}
        alt="Pratinjau foto kandidat"
        className={`shrink-0 overflow-hidden rounded-xl border border-gold/30 object-cover ${
          isPair ? 'h-40 w-40' : 'h-44 w-32'
        }`}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id="candidate-photo-file"
          onChange={(event) => {
            handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={processing}
            className={btnGhost}
          >
            {processing ? <Spinner className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
            {value ? 'Ganti Foto' : 'Unggah Foto'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} className={btnGhost}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Hapus
            </button>
          )}
        </div>
        <p className="text-xs text-gold/55">
          JPG/PNG/WebP, otomatis dikecilkan ke ±800 px agar ringan. Foto {isPair ? 'persegi' : 'potret 3:4'}{' '}
          paling pas.
        </p>
        <Field label="atau tempel alamat (URL) gambar" htmlFor="candidate-photo-url">
          <input
            id="candidate-photo-url"
            value={isUploaded ? '' : value}
            onChange={(event) => onChange(event.target.value.trim())}
            placeholder={isUploaded ? 'Foto terunggah dipakai' : 'https://… atau /images/nama.jpg'}
            className={inputSingle}
          />
        </Field>
      </div>
    </div>
  )
}

/**
 * Formulir tambah/ubah kandidat. Dipasang ulang (mounted) setiap dibuka sehingga state
 * formulir selalu mulai dari data kandidat yang dipilih.
 */
export default function CandidateEditor({ initial, isNew, saving, onSave, onClose, showToast }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const isPair = form.type === 'kabem'
  const meta = CANDIDATE_TYPES[form.type]

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [saving, onClose])

  const submit = (event) => {
    event.preventDefault()
    const message = validateCandidateForm(form)
    setError(message)
    if (!message) onSave(form)
  }

  return (
    <div
      className="fixed inset-0 z-[65] flex animate-fade-in items-end justify-center bg-black/75 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-editor-title"
        className="flex max-h-[94vh] w-full max-w-3xl animate-modal-in flex-col overflow-hidden rounded-t-2xl border border-gold/30 bg-card-dark shadow-2xl shadow-black/60 sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-gold/20 bg-brand px-5 py-4 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/75">{meta.label}</p>
            <h2 id="candidate-editor-title" className="truncate text-lg font-extrabold">
              {isNew ? 'Tambah Kandidat' : `Ubah Kandidat ${form.number}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 transition-colors hover:bg-white/15 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <Field label="Nomor urut" htmlFor="cand-number">
              <input
                id="cand-number"
                value={form.number}
                onChange={set('number')}
                maxLength={3}
                inputMode="numeric"
                className={inputSingle}
              />
            </Field>
            {isPair ? (
              <p className="self-end rounded-xl border border-gold/20 bg-bean/50 px-4 py-3 text-sm text-gold/80">
                Nama paslon:{' '}
                <strong className="text-white">
                  {[form.ketua.trim(), form.wakil.trim()].filter(Boolean).join(' & ') || '—'}
                </strong>
              </p>
            ) : (
              <Field label="Nama lengkap" htmlFor="cand-name">
                <input id="cand-name" value={form.name} onChange={set('name')} maxLength={80} className={inputSingle} />
              </Field>
            )}
          </div>

          {isPair ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {[
                ['Calon Ketua BEM', 'ketua', 'ketuaJurusan', 'ketuaAngkatan'],
                ['Calon Wakil Ketua BEM', 'wakil', 'wakilJurusan', 'wakilAngkatan'],
              ].map(([title, nameKey, jurusanKey, angkatanKey]) => (
                <fieldset key={nameKey} className="space-y-3 rounded-xl border border-gold/20 bg-bean/40 p-4">
                  <legend className="px-2 text-sm font-bold text-gold">{title}</legend>
                  <Field label="Nama lengkap" htmlFor={`cand-${nameKey}`}>
                    <input
                      id={`cand-${nameKey}`}
                      value={form[nameKey]}
                      onChange={set(nameKey)}
                      maxLength={60}
                      className={inputSingle}
                    />
                  </Field>
                  <div className="grid grid-cols-[1fr_96px] gap-3">
                    <Field label="Jurusan" htmlFor={`cand-${jurusanKey}`}>
                      <input
                        id={`cand-${jurusanKey}`}
                        value={form[jurusanKey]}
                        onChange={set(jurusanKey)}
                        maxLength={60}
                        className={inputSingle}
                      />
                    </Field>
                    <Field label="Angkatan" htmlFor={`cand-${angkatanKey}`}>
                      <input
                        id={`cand-${angkatanKey}`}
                        value={form[angkatanKey]}
                        onChange={set(angkatanKey)}
                        maxLength={6}
                        placeholder="2024"
                        className={inputSingle}
                      />
                    </Field>
                  </div>
                </fieldset>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field label="Jurusan" htmlFor="cand-jurusan">
                <input
                  id="cand-jurusan"
                  value={form.jurusan}
                  onChange={set('jurusan')}
                  maxLength={60}
                  className={inputSingle}
                />
              </Field>
              <Field label="Angkatan" htmlFor="cand-angkatan">
                <input
                  id="cand-angkatan"
                  value={form.angkatan}
                  onChange={set('angkatan')}
                  maxLength={6}
                  placeholder="2024"
                  className={inputSingle}
                />
              </Field>
            </div>
          )}

          <Field label={isPair ? 'Foto paslon' : 'Foto kandidat'} htmlFor="candidate-photo-file">
            <PhotoField
              value={form.photo}
              isPair={isPair}
              showToast={showToast}
              onChange={(photo) => setForm((prev) => ({ ...prev, photo }))}
            />
          </Field>

          <Field label="Slogan" htmlFor="cand-tagline">
            <input
              id="cand-tagline"
              value={form.tagline}
              onChange={set('tagline')}
              maxLength={140}
              className={inputSingle}
            />
          </Field>

          <Field label="Visi" htmlFor="cand-visi">
            <textarea id="cand-visi" rows={3} value={form.visi} onChange={set('visi')} className={textareaClass} />
          </Field>

          <div className="space-y-6">
            <PointListEditor
              idPrefix="cand-misi"
              label="Misi"
              addLabel="Tambah Poin Misi"
              placeholderPrefix="Tulis poin misi ke"
              hint="Tekan Enter untuk menambah poin baru (Shift+Enter untuk baris baru di dalam poin)."
              items={form.misi}
              multiline
              onChange={(misi) => setForm((prev) => ({ ...prev, misi }))}
            />

            {isPair && (
              <PointListEditor
                idPrefix="cand-programs"
                label="Program prioritas"
                addLabel="Tambah Program"
                placeholderPrefix="Tulis program prioritas ke"
                hint="Tekan Enter untuk menambah program baru."
                items={form.programs}
                onChange={(programs) => setForm((prev) => ({ ...prev, programs }))}
              />
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-brand bg-brand/20 p-3 text-sm font-semibold text-gold">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gold/20 bg-card-dark p-4">
          <button type="button" onClick={onClose} disabled={saving} className={btnGhost}>
            Batal
          </button>
          <button type="submit" id="btn-save-candidate" disabled={saving} className={btnPrimary}>
            {saving && <Spinner className="h-4 w-4" />} Simpan Kandidat
          </button>
        </div>
      </form>
    </div>
  )
}
