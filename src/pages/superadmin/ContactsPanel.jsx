import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Headphones,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useElection } from '../../context/electionContext'
import { DEFAULT_CONTACTS } from '../../data'
import { saveContacts } from '../../services/superAdminService'
import { btnGhost, btnPrimary, iconBtn, inputSingle } from './styles'
import { Card, ConfirmDialog, SaveBar } from './ui'

const newId = () => `cp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const normalize = (items) =>
  (items || []).map((item) => ({
    id: item.id || newId(),
    name: String(item.name || '').trim(),
    phone: String(item.phone || '').trim(),
    whatsapp: String(item.whatsapp || '').trim(),
    available: String(item.available || '').trim(),
  }))

export default function ContactsPanel({ showToast }) {
  const { contacts, appName } = useElection()
  const baseline = useMemo(() => normalize(contacts), [contacts])

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
        name: `Narahubung Baru ${prev.length + 1}`,
        phone: '0812-0000-0000',
        whatsapp: '6281200000000',
        available: '08.00 - 20.00 WIB',
      },
    ])
  }

  const handleResetToDefault = () => {
    setItems(DEFAULT_CONTACTS)
    setResetDialogOpen(false)
    showToast({
      type: 'info',
      title: 'Kontak dikembalikan ke 5 bawaan',
      message: 'Klik "Simpan Narahubung" di bawah untuk menerapkan ke database.',
    })
  }

  const handleDiscard = () => {
    setItems(baseline)
  }

  const handleSave = async () => {
    if (items.length === 0) {
      showToast({
        type: 'error',
        title: 'Daftar kontak kosong',
        message: 'Minimal harus ada 1 kontak narahubung.',
      })
      return
    }

    // Validate
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.name.trim()) {
        showToast({
          type: 'error',
          title: `Nama kontak #${i + 1} kosong`,
          message: 'Setiap narahubung wajib memiliki nama.',
        })
        return
      }
      if (!item.phone.trim()) {
        showToast({
          type: 'error',
          title: `Nomor telepon #${i + 1} kosong`,
          message: 'Setiap narahubung wajib memiliki nomor telepon/WA.',
        })
        return
      }
    }

    setSaving(true)
    try {
      const cleaned = items.map((i) => ({
        id: i.id || newId(),
        name: i.name.trim(),
        phone: i.phone.trim(),
        whatsapp: i.whatsapp.replace(/[^0-9]/g, '') || i.phone.replace(/[^0-9]/g, ''),
        available: i.available.trim(),
      }))

      await saveContacts(cleaned)
      showToast({
        type: 'success',
        title: 'Narahubung berhasil disimpan',
        message: 'Daftar kontak telah diperbarui secara real-time di halaman Kontak Pemilih.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan narahubung',
        message:
          error?.code === 'permission-denied'
            ? 'Akses ditolak. Pastikan email Anda terdaftar sebagai Super Admin.'
            : 'Terjadi kesalahan saat menyimpan narahubung. Coba lagi.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Pengelolaan Narahubung (Contact Person)"
        description={`Atur 5 nomor kontak resmi yang tampil pada halaman Pusat Bantuan & Narahubung (${appName}).`}
        icon={Headphones}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              className={btnGhost}
              title="Kembalikan ke 5 kontak bawaan resmi Panitia"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Reset 5 Kontak Bawaan</span>
            </button>
            <button type="button" onClick={add} className={btnPrimary}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tambah Kontak</span>
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
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-card-dark text-xs font-black text-gold">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-bold text-gold">
                      {item.name || `Narahubung ${index + 1}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
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
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-500/30 text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed ml-2"
                      title="Hapus kontak ini"
                      aria-label="Hapus kontak"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gold/80">
                      Nama Kontak
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      placeholder="Contoh: Helpdesk Teknis 1"
                      onChange={(e) => update(index, { name: e.target.value })}
                      className={inputSingle}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gold/80">
                      Jam Layanan (Ketersediaan)
                    </label>
                    <input
                      type="text"
                      value={item.available}
                      placeholder="Contoh: 08.00 - 21.00 WIB"
                      onChange={(e) => update(index, { available: e.target.value })}
                      className={inputSingle}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gold/80">
                      Nomor Telepon (Tampilan)
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        type="text"
                        value={item.phone}
                        placeholder="Contoh: 0812-3456-7891"
                        onChange={(e) => {
                          const val = e.target.value
                          const cleanDigits = val.replace(/[^0-9]/g, '')
                          const wa = cleanDigits.startsWith('0')
                            ? `62${cleanDigits.slice(1)}`
                            : cleanDigits
                          update(index, { phone: val, whatsapp: item.whatsapp ? item.whatsapp : wa })
                        }}
                        className={`${inputSingle} pl-9 font-mono text-xs`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gold/80">
                      Nomor WhatsApp (Format: 628...)
                    </label>
                    <div className="relative">
                      <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
                      <input
                        type="text"
                        value={item.whatsapp}
                        placeholder="Contoh: 6281234567891"
                        onChange={(e) => update(index, { whatsapp: e.target.value.replace(/[^0-9]/g, '') })}
                        className={`${inputSingle} pl-9 font-mono text-xs`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Save Bar */}
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saveLabel="Simpan Narahubung"
      />

      {/* Dialog Konfirmasi Reset */}
      <ConfirmDialog
        open={resetDialogOpen}
        title="Kembalikan ke 5 Kontak Bawaan?"
        message="Daftar kontak akan diatur ulang ke 5 narahubung resmi standar (Helpdesk Teknis 1 & 2, Divisi DPT, Humas, dan Panwaslu)."
        confirmLabel="Ya, Kembalikan ke Bawaan"
        onConfirm={handleResetToDefault}
        onCancel={() => setResetDialogOpen(false)}
      />
    </div>
  )
}
