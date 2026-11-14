import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Spinner } from '../../components/SharedUI'
import { useElection } from '../../context/electionContext'
import { buildAngkatan } from '../../data'
import { resyncStatsFromDpt, saveCategories } from '../../services/superAdminService'
import { btnGhost, btnPrimary, iconBtn, inputSingle } from './styles'
import { Card, ConfirmDialog, SaveBar } from './ui'

const slugify = (text) =>
  String(text || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')

const normalize = (items) =>
  (items || []).map((item) => ({
    key: String(item.key || '').trim().toUpperCase(),
    label: String(item.label || '').trim().toUpperCase(),
  }))

export default function CategoriesPanel({ showToast }) {
  const { angkatan, year } = useElection()
  const baseline = useMemo(() => normalize(angkatan), [angkatan])

  const [items, setItems] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
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
    const defaultKey = `KAT-${items.length + 1}`
    setItems((prev) => [...prev, { key: defaultKey, label: '' }])
  }

  const handleResetToDefault = () => {
    const defaults = buildAngkatan(year)
    setItems(defaults)
    setResetDialogOpen(false)
    showToast({
      type: 'info',
      title: 'Kategori Dikembalikan ke 12 Bawaan',
      message: 'Klik "Simpan Perubahan" di bawah untuk menerapkan ke database.',
    })
  }

  const handleDiscard = () => {
    setItems(baseline)
  }

  const handleSave = async () => {
    if (items.length === 0) {
      showToast({
        type: 'error',
        title: 'Kategori kosong',
        message: 'Minimal harus ada 1 kategori pemilih.',
      })
      return
    }

    // Check empty labels or keys
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.label.trim()) {
        showToast({
          type: 'error',
          title: `Label kategori #${i + 1} kosong`,
          message: 'Setiap kategori harus memiliki nama label tampilan.',
        })
        return
      }
      if (!item.key.trim()) {
        showToast({
          type: 'error',
          title: `Kode kategori #${i + 1} kosong`,
          message: 'Setiap kategori harus memiliki kode sistem yang unik.',
        })
        return
      }
    }

    // Check duplicate keys
    const keys = items.map((i) => i.key.trim().toUpperCase())
    const duplicates = keys.filter((k, idx) => keys.indexOf(k) !== idx)
    if (duplicates.length > 0) {
      showToast({
        type: 'error',
        title: 'Kode sistem duplikat',
        message: `Kode "${duplicates[0]}" dipakai lebih dari satu kali. Kode harus unik.`,
      })
      return
    }

    setSaving(true)
    try {
      const cleaned = items.map((i) => ({
        key: i.key.trim().toUpperCase(),
        label: i.label.trim().toUpperCase(),
      }))
      await saveCategories(cleaned)
      showToast({
        type: 'success',
        title: 'Kategori berhasil disimpan',
        message: 'Kategori pemilih dan statistik partisipasi telah diperbarui secara real-time.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan kategori',
        message:
          error?.code === 'permission-denied'
            ? 'Akses ditolak. Pastikan email Anda terdaftar sebagai Super Admin.'
            : 'Terjadi kesalahan saat menyimpan kategori. Coba lagi.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSyncStats = async () => {
    setSyncing(true)
    try {
      await resyncStatsFromDpt(items)
      showToast({
        type: 'success',
        title: 'Statistik tersinkronisasi',
        message: 'Data statistik per kategori berhasil dihitung ulang dari DPT.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Gagal sinkronisasi statistik',
        message: error?.message || 'Terjadi kesalahan saat menghitung ulang statistik.',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Daftar Kategori Pemilih"
        description="Atur kategori pemilih yang dipakai untuk pemilihan dan tampilan statistik partisipasi. Urutan di bawah menentukan susunan kartu pada Dashboard Pemilih."
        icon={Layers}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              className={btnGhost}
              title="Kembalikan ke 12 kategori standar (S1, S2, S3, Profesi, RPL)"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Reset 12 Bawaan</span>
            </button>
            <button
              type="button"
              onClick={handleSyncStats}
              disabled={syncing || dirty}
              className={btnGhost}
              title={dirty ? 'Simpan perubahan terlebih dahulu sebelum sinkronisasi' : 'Hitung ulang statistik dari DPT'}
            >
              {syncing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">Sinkronkan Statistik</span>
            </button>
            <button type="button" onClick={add} className={btnPrimary}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tambah Kategori</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {items.map((item, index) => {
            const isFirst = index === 0
            const isLast = index === items.length - 1

            return (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-bean/60 p-3.5 transition-all hover:border-gold/40 sm:flex-row sm:items-center"
              >
                {/* Drag / Reorder Controls */}
                <div className="flex items-center gap-1">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-card-dark text-xs font-black text-gold">
                    {index + 1}
                  </span>
                  <div className="flex flex-row sm:flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={isFirst}
                      className={iconBtn}
                      aria-label={`Pindahkan ${item.label || 'kategori'} ke atas`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={isLast}
                      className={iconBtn}
                      aria-label={`Pindahkan ${item.label || 'kategori'} ke bawah`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gold/80">
                      Nama Tampilan (Label)
                    </label>
                    <input
                      type="text"
                      value={item.label}
                      placeholder="Contoh: S1-26"
                      onChange={(e) => {
                        const newLabel = e.target.value.toUpperCase()
                        // If key was auto-generated or empty, keep it updated
                        if (!item.key || item.key.toUpperCase().startsWith('KAT-')) {
                          update(index, { label: newLabel, key: slugify(newLabel) })
                        } else {
                          update(index, { label: newLabel })
                        }
                      }}
                      className={`${inputSingle} uppercase`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gold/80">
                      Kode Sistem (Key Database)
                    </label>
                    <input
                      type="text"
                      value={item.key}
                      placeholder="Contoh: S1-26"
                      onChange={(e) => update(index, { key: slugify(e.target.value) })}
                      className={`${inputSingle} font-mono text-sm uppercase`}
                    />
                  </div>
                </div>

                {/* Preview Badge & Delete Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gold/60 hidden lg:inline">Preview:</span>
                    <span className="inline-flex items-center rounded-lg border border-gold/30 bg-gold/15 px-2.5 py-1 text-xs font-bold uppercase text-gold">
                      {item.label || 'KATEGORI'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={items.length <= 1}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-500/30 text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={items.length <= 1 ? 'Minimal 1 kategori' : 'Hapus kategori ini'}
                    aria-label={`Hapus ${item.label || 'kategori'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Info Card */}
      <Card
        title="Panduan Format Excel/CSV & Sinkronisasi"
        description="Informasi mengenai cara pencocokan kolom angkatan pada file DPT yang diunggah oleh admin."
        icon={Sparkles}
      >
        <div className="space-y-2 text-xs leading-relaxed text-gold/80">
          <p>
            • <strong>Pencocokan Cerdas:</strong> Saat mengimpor DPT via CSV/Excel, sistem akan otomatis mencocokkan nilai kolom <code className="text-gold font-mono">angkatan</code> baik berdasarkan Label tampilan (mis. <code className="text-gold font-mono">S1-26</code>, <code className="text-gold font-mono">RPL-25</code>, <code className="text-gold font-mono">PROFESI</code>) maupun variasi lainnya (mis. <code className="text-gold font-mono">s1-26</code>, <code className="text-gold font-mono">S1 akt 26</code>, <code className="text-gold font-mono">2026</code>).
          </p>
          <p>
            • <strong>Format Huruf Kapital:</strong> Kategori disimpan dan ditampilkan menggunakan huruf kapital dengan tanda hubung, misalnya <code className="text-gold font-mono">S1-26</code>, <code className="text-gold font-mono">S2-25</code>, <code className="text-gold font-mono">RPL-24</code>, <code className="text-gold font-mono">PROFESI</code>.
          </p>
          <p>
            • <strong>Pembaruan Statistik:</strong> Setiap kali Anda menyimpan kategori baru atau mengubah urutan, sistem akan otomatis menyinkronkan dokumen statistik agar dashboard langsung mencerminkan data terbaru.
          </p>
        </div>
      </Card>

      {/* Save Bar */}
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saveLabel="Simpan Kategori"
      />

      {/* Dialog Konfirmasi Reset */}
      <ConfirmDialog
        open={resetDialogOpen}
        title="Kembalikan ke 12 Kategori Bawaan?"
        message={`Daftar kategori akan diatur ulang ke 12 kategori standar untuk tahun ${year}: S1 (akt ${year % 100}..${(year % 100) - 3}), S2 (akt ${year % 100}..${(year % 100) - 1}), S3 (akt ${year % 100}..${(year % 100) - 1}), Profesi, dan RPL (akt ${year % 100}..${(year % 100) - 2}).`}
        confirmLabel="Ya, Kembalikan ke 12 Bawaan"
        onConfirm={handleResetToDefault}
        onCancel={() => setResetDialogOpen(false)}
      />
    </div>
  )
}
