import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, HelpCircle, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useElection } from '../../context/electionContext'
import { DEFAULT_FAQS } from '../../data'
import { saveFaqs } from '../../services/superAdminService'
import { btnGhost, btnPrimary, iconBtn, inputSingle, textareaClass } from './styles'
import { Card, ConfirmDialog, Field, SaveBar } from './ui'

const newId = () => `faq-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const normalize = (items) =>
  (items || []).map((item) => ({
    id: item.id || newId(),
    question: String(item.question || '').trim(),
    answer: String(item.answer || '').trim(),
  }))

export default function FaqPanel({ showToast }) {
  const { faqs, appName } = useElection()
  const baseline = useMemo(() => normalize(faqs), [faqs])

  const [items, setItems] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const dirty = JSON.stringify(items) !== JSON.stringify(baseline)

  const update = (index, patch) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const move = (index, delta) => {
    setItems((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const remove = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const add = () => {
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        question: '',
        answer: '',
      },
    ])
  }

  const handleResetToDefault = () => {
    setItems(normalize(DEFAULT_FAQS))
    setResetDialogOpen(false)
    showToast({
      type: 'info',
      title: 'FAQ dikembalikan ke bawaan',
      message: 'Klik "Simpan FAQ" di bawah untuk menerapkan ke database.',
    })
  }

  const handleDiscard = () => {
    setItems(baseline)
  }

  const handleSave = async () => {
    if (items.length === 0) {
      showToast({
        type: 'error',
        title: 'Daftar FAQ kosong',
        message: 'Minimal harus ada 1 pertanyaan FAQ.',
      })
      return
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.question.trim()) {
        showToast({
          type: 'error',
          title: `Pertanyaan FAQ #${i + 1} kosong`,
          message: 'Setiap item FAQ wajib memiliki pertanyaan.',
        })
        return
      }
      if (!item.answer.trim()) {
        showToast({
          type: 'error',
          title: `Jawaban FAQ #${i + 1} kosong`,
          message: 'Setiap item FAQ wajib memiliki jawaban.',
        })
        return
      }
    }

    setSaving(true)
    try {
      const cleaned = items.map((item) => ({
        id: item.id || newId(),
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))

      await saveFaqs(cleaned)
      setItems(cleaned)
      showToast({
        type: 'success',
        title: 'FAQ berhasil disimpan',
        message: 'Perubahan langsung tampil di halaman Narahubung & Bantuan pemilih.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan FAQ',
        message:
          error?.code === 'permission-denied'
            ? 'Akses ditolak. Pastikan email Anda terdaftar sebagai Super Admin.'
            : 'Terjadi kesalahan saat menyimpan FAQ. Coba lagi.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Pengelolaan Frequently Asked Question (FAQ)"
        description={`Atur daftar pertanyaan dan jawaban yang tampil di halaman Narahubung & Bantuan (${appName}).`}
        icon={HelpCircle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              className={btnGhost}
              title="Kembalikan ke daftar FAQ bawaan"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Reset FAQ Bawaan</span>
            </button>
            <button type="button" onClick={add} id="btn-add-faq" className={btnPrimary}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tambah FAQ</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {items.map((item, index) => {
            const isFirst = index === 0
            const isLast = index === items.length - 1

            return (
              <div
                key={item.id || index}
                className="rounded-xl border border-gold/20 bg-bean/60 p-4 transition-all hover:border-gold/40"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gold/15 pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-card-dark text-xs font-black text-gold">
                      #{index + 1}
                    </span>
                    <span className="truncate text-sm font-bold text-gold">
                      {item.question || `FAQ ${index + 1}`}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={isFirst}
                      className={iconBtn}
                      aria-label="Pindahkan ke atas"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={isLast}
                      className={iconBtn}
                      aria-label="Pindahkan ke bawah"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={items.length <= 1}
                      className="ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-500/30 text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Hapus FAQ ini"
                      aria-label="Hapus FAQ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 space-y-3">
                  <Field label="Pertanyaan" htmlFor={`faq-question-${item.id}`}>
                    <input
                      id={`faq-question-${item.id}`}
                      type="text"
                      value={item.question}
                      maxLength={200}
                      placeholder="Contoh: OTP tidak masuk ke email UI?"
                      onChange={(e) => update(index, { question: e.target.value })}
                      className={inputSingle}
                    />
                  </Field>

                  <Field label="Jawaban" htmlFor={`faq-answer-${item.id}`}>
                    <textarea
                      id={`faq-answer-${item.id}`}
                      rows={3}
                      value={item.answer}
                      maxLength={1000}
                      placeholder="Tuliskan penjelasan jawaban secara singkat dan jelas..."
                      onChange={(e) => update(index, { answer: e.target.value })}
                      className={textareaClass}
                    />
                  </Field>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saveLabel="Simpan FAQ"
      />

      <ConfirmDialog
        open={resetDialogOpen}
        title="Kembalikan ke FAQ Bawaan?"
        message="Daftar FAQ akan diatur ulang ke 4 pertanyaan dan jawaban standar bawaan sistem."
        confirmLabel="Ya, Kembalikan ke Bawaan"
        onConfirm={handleResetToDefault}
        onCancel={() => setResetDialogOpen(false)}
      />
    </div>
  )
}
