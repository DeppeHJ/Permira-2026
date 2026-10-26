import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, ScrollText, Trash2 } from 'lucide-react'
import { useElection } from '../../context/electionContext'
import { SOP_TABS } from '../../data'
import { saveSop } from '../../services/superAdminService'
import { btnGhost, iconBtn, inputSingle, textareaClass } from './styles'
import { Card, Field, SaveBar } from './ui'

const newId = () => `sop-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const toDraft = (tabs) =>
  tabs.map((tab) => ({
    id: tab.id || newId(),
    label: String(tab.label ?? ''),
    description: String(tab.description ?? ''),
    rulesText: (tab.rules || []).join('\n'),
  }))

const splitRules = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

export default function SopPanel({ showToast }) {
  const { sop } = useElection()
  const baseline = useMemo(() => toDraft(sop), [sop])
  const [tabs, setTabs] = useState(baseline)
  const [activeId, setActiveId] = useState(baseline[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(tabs) !== JSON.stringify(baseline)
  const active = tabs.find((tab) => tab.id === activeId) || tabs[0]

  const update = (id, patch) =>
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)))

  const move = (index, delta) =>
    setTabs((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const add = () => {
    const tab = { id: newId(), label: 'Kategori Baru', description: '', rulesText: '' }
    setTabs((prev) => [...prev, tab])
    setActiveId(tab.id)
  }

  const remove = (id) => {
    const next = tabs.filter((tab) => tab.id !== id)
    setTabs(next)
    if (id === activeId) setActiveId(next[0]?.id ?? '')
  }

  const handleSave = async () => {
    if (tabs.length === 0) {
      showToast({ type: 'error', title: 'SOP kosong', message: 'Tambahkan minimal satu kategori.' })
      return
    }
    const invalid = tabs.find((tab) => !tab.label.trim() || splitRules(tab.rulesText).length === 0)
    if (invalid) {
      setActiveId(invalid.id)
      showToast({
        type: 'error',
        title: 'Kategori belum lengkap',
        message: 'Setiap kategori wajib punya nama dan minimal satu aturan.',
      })
      return
    }
    setSaving(true)
    try {
      await saveSop(
        tabs.map((tab) => ({
          id: tab.id,
          label: tab.label.trim(),
          description: tab.description.trim(),
          rules: splitRules(tab.rulesText),
        })),
      )
      showToast({ type: 'success', title: 'SOP disimpan', message: 'Perubahan langsung tampil di halaman SOP pemilih.' })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan SOP',
        message:
          error?.code === 'permission-denied'
            ? 'Ditolak oleh aturan keamanan. Deploy firestore.rules terbaru.'
            : 'Terjadi kesalahan. Coba lagi.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Card
        icon={ScrollText}
        title="SOP Pemilihan"
        description="Susun kategori SOP (tab di halaman pemilih) beserta daftar aturannya. Tulis satu aturan per baris."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                const draft = toDraft(SOP_TABS)
                setTabs(draft)
                setActiveId(draft[0].id)
              }}
              className={btnGhost}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Isi Contoh Bawaan
            </button>
            <button type="button" onClick={add} id="btn-add-sop-tab" className={btnGhost}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Kategori
            </button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <ul className="space-y-2" aria-label="Kategori SOP">
            {tabs.map((tab, index) => {
              const isActive = tab.id === active?.id
              return (
                <li
                  key={tab.id}
                  className={`flex items-center gap-1 rounded-xl border p-1.5 ${
                    isActive ? 'border-gold bg-brand/30' : 'border-gold/20 bg-bean/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(tab.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left text-sm font-bold text-gold hover:bg-gold/10"
                  >
                    {tab.label || 'Tanpa nama'}
                    <span className="block text-[11px] font-medium text-gold/60">
                      {splitRules(tab.rulesText).length} aturan
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className={iconBtn}
                    aria-label="Naikkan kategori"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === tabs.length - 1}
                    className={iconBtn}
                    aria-label="Turunkan kategori"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>

          {active ? (
            <div className="space-y-5 rounded-xl border border-gold/20 bg-bean/50 p-5">
              <div className="flex items-end gap-3">
                <Field label="Nama kategori (tab)" htmlFor="sop-label" className="flex-1">
                  <input
                    id="sop-label"
                    value={active.label}
                    onChange={(event) => update(active.id, { label: event.target.value })}
                    maxLength={40}
                    className={inputSingle}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => remove(active.id)}
                  className={`${iconBtn} h-11 w-11 hover:border-red-400 hover:bg-red-950/60 hover:text-red-300`}
                  aria-label="Hapus kategori ini"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Field label="Deskripsi singkat" htmlFor="sop-desc">
                <input
                  id="sop-desc"
                  value={active.description}
                  onChange={(event) => update(active.id, { description: event.target.value })}
                  maxLength={160}
                  className={inputSingle}
                />
              </Field>
              <Field
                label="Daftar aturan"
                htmlFor="sop-rules"
                hint={`Satu aturan per baris — saat ini ${splitRules(active.rulesText).length} aturan.`}
              >
                <textarea
                  id="sop-rules"
                  rows={10}
                  value={active.rulesText}
                  onChange={(event) => update(active.id, { rulesText: event.target.value })}
                  className={textareaClass}
                />
              </Field>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-gold/30 p-6 text-center text-sm text-gold/70">
              Belum ada kategori. Klik “Tambah Kategori”.
            </p>
          )}
        </div>
      </Card>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={() => {
          setTabs(baseline)
          setActiveId(baseline[0]?.id ?? '')
        }}
        saveLabel="Simpan SOP"
      />
    </div>
  )
}
