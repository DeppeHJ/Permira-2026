import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarClock, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useElection } from '../../context/electionContext'
import { ELECTION_TIMELINE } from '../../data'
import { saveTimeline } from '../../services/superAdminService'
import { btnGhost, iconBtn, inputSingle } from './styles'
import { Card, Field, SaveBar } from './ui'

const STATUS_OPTIONS = [
  { value: 'done', label: 'Selesai' },
  { value: 'active', label: 'Sedang berlangsung' },
  { value: 'upcoming', label: 'Akan datang' },
]

const STATUS_DOT = {
  done: 'bg-gold',
  active: 'bg-brand ring-4 ring-brand/30',
  upcoming: 'border border-gold/40',
}

const newId = () => `t-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const normalize = (items) =>
  items.map((item) => ({
    id: item.id || newId(),
    title: String(item.title ?? ''),
    date: String(item.date ?? ''),
    status: STATUS_OPTIONS.some((s) => s.value === item.status) ? item.status : 'upcoming',
  }))

export default function TimelinePanel({ showToast }) {
  const { timeline } = useElection()
  const baseline = useMemo(() => normalize(timeline), [timeline])
  const [items, setItems] = useState(baseline)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(items) !== JSON.stringify(baseline)

  const update = (id, patch) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const move = (index, delta) =>
    setItems((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const remove = (id) => setItems((prev) => prev.filter((item) => item.id !== id))
  const add = () =>
    setItems((prev) => [...prev, { id: newId(), title: '', date: '', status: 'upcoming' }])

  const handleSave = async () => {
    if (items.length === 0) {
      showToast({ type: 'error', title: 'Timeline kosong', message: 'Tambahkan minimal satu tahapan.' })
      return
    }
    if (items.some((item) => !item.title.trim())) {
      showToast({ type: 'error', title: 'Judul belum lengkap', message: 'Setiap tahapan wajib memiliki judul.' })
      return
    }
    setSaving(true)
    try {
      await saveTimeline(
        items.map((item) => ({
          id: item.id,
          title: item.title.trim(),
          date: item.date.trim(),
          status: item.status,
        })),
      )
      showToast({ type: 'success', title: 'Timeline disimpan', message: 'Perubahan langsung tampil di dashboard pemilih.' })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan timeline',
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
        icon={CalendarClock}
        title="Timeline Pemilihan"
        description="Atur judul tahapan, teks tanggal (bebas, mis. “23 – 24 Okt 2027”), dan statusnya. Urutan di sini sama dengan urutan di dashboard pemilih."
        actions={
          <>
            <button
              type="button"
              onClick={() => setItems(normalize(ELECTION_TIMELINE))}
              className={btnGhost}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Isi Contoh Bawaan
            </button>
            <button type="button" onClick={add} id="btn-add-timeline" className={btnGhost}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Tahapan
            </button>
          </>
        }
      >
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gold/30 p-6 text-center text-sm text-gold/70">
            Belum ada tahapan. Klik “Tambah Tahapan”.
          </p>
        )}

        <ol className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="grid gap-3 rounded-xl border border-gold/20 bg-bean/50 p-4 lg:grid-cols-[auto_1.4fr_1fr_1fr_auto] lg:items-end"
            >
              <span
                className={`hidden h-9 w-9 place-items-center self-center rounded-full text-xs font-extrabold text-card-dark lg:grid ${STATUS_DOT[item.status]} ${
                  item.status === 'active' ? 'text-white' : ''
                }`}
                aria-hidden="true"
              >
                {index + 1}
              </span>

              <Field label="Judul tahapan" htmlFor={`tl-title-${item.id}`}>
                <input
                  id={`tl-title-${item.id}`}
                  value={item.title}
                  onChange={(event) => update(item.id, { title: event.target.value })}
                  placeholder="mis. Masa Pemungutan Suara"
                  maxLength={80}
                  className={inputSingle}
                />
              </Field>
              <Field label="Tanggal" htmlFor={`tl-date-${item.id}`}>
                <input
                  id={`tl-date-${item.id}`}
                  value={item.date}
                  onChange={(event) => update(item.id, { date: event.target.value })}
                  placeholder="mis. 23 – 24 Okt 2027"
                  maxLength={60}
                  className={inputSingle}
                />
              </Field>
              <Field label="Status" htmlFor={`tl-status-${item.id}`}>
                <select
                  id={`tl-status-${item.id}`}
                  value={item.status}
                  onChange={(event) => update(item.id, { status: event.target.value })}
                  className={inputSingle}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-card-dark">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className={iconBtn}
                  aria-label="Naikkan tahapan"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className={iconBtn}
                  aria-label="Turunkan tahapan"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className={`${iconBtn} hover:border-red-400 hover:bg-red-950/60 hover:text-red-300`}
                  aria-label="Hapus tahapan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={() => setItems(baseline)}
        saveLabel="Simpan Timeline"
      />
    </div>
  )
}
