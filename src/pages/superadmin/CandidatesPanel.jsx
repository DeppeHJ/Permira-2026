import { useState } from 'react'
import { Crown, Pencil, Plus, SquareDashedBottom, Trash2, Users } from 'lucide-react'
import { CandidatePhoto, Spinner } from '../../components/SharedUI'
import { useElection } from '../../context/electionContext'
import { DEFAULT_KOTAK_KOSONG } from '../../data'
import { deleteCandidate, saveCandidate, saveKotakKosongSettings } from '../../services/superAdminService'
import {
  CANDIDATE_TYPES,
  emptyCandidateForm,
  newCandidateId,
  toCandidateForm,
} from '../../utils/candidates'
import CandidateEditor from './CandidateEditor'
import { btnPrimary, iconBtn, textareaClass } from './styles'
import { Card, ConfirmDialog, Field } from './ui'

const nextNumber = (list) => {
  const max = list.reduce((acc, c) => Math.max(acc, Number(c.number) || 0), 0)
  return String(max + 1).padStart(2, '0')
}

function CandidateRow({ candidate, onEdit, onDelete }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-gold/20 bg-bean/50 p-3">
      <CandidatePhoto
        src={candidate.photo}
        className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gold/25 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-extrabold text-white">
            {candidate.number}
          </span>
          <span className="truncate font-bold text-white">{candidate.name}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-gold/70">{candidate.study || 'Jurusan/angkatan belum diisi'}</p>
        <p className="truncate text-xs italic text-gold/50">“{candidate.tagline || 'Belum ada slogan'}”</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onEdit(candidate)} className={iconBtn} aria-label={`Ubah ${candidate.name}`}>
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(candidate)}
          className={`${iconBtn} hover:border-red-400 hover:bg-red-950/60 hover:text-red-300`}
          aria-label={`Hapus ${candidate.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}

export default function CandidatesPanel({ showToast }) {
  const { aiCandidates, kabemCandidates, usingDefaultCandidates, kotakKosongConfig } = useElection()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [kkEnabled, setKkEnabled] = useState(kotakKosongConfig.enabled)
  const [kkDescription, setKkDescription] = useState(kotakKosongConfig.description)
  const [savingKk, setSavingKk] = useState(false)

  const openNew = (type) => {
    const list = type === 'ai' ? aiCandidates : kabemCandidates
    setEditing({ id: newCandidateId(type), isNew: true, form: emptyCandidateForm(type, nextNumber(list)) })
  }
  const openEdit = (candidate) =>
    setEditing({ id: candidate.id, isNew: false, form: toCandidateForm(candidate) })

  const failToast = (title, error) =>
    showToast({
      type: 'error',
      title,
      message:
        error?.code === 'permission-denied'
          ? 'Ditolak oleh aturan keamanan. Deploy firestore.rules terbaru dan pastikan email Anda Super Admin.'
          : error?.code === 'invalid-argument' || /longer than|too large|exceeds/i.test(error?.message || '')
            ? 'Data terlalu besar. Gunakan foto beresolusi lebih kecil.'
            : 'Terjadi kesalahan. Coba lagi.',
    })

  const handleSave = async (form) => {
    setBusy(true)
    try {
      await saveCandidate(editing.id, form, { needsSeed: usingDefaultCandidates })
      showToast({ type: 'success', title: 'Kandidat disimpan', message: 'Perubahan langsung tampil di bilik suara.' })
      setEditing(null)
    } catch (error) {
      failToast('Gagal menyimpan kandidat', error)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteCandidate(deleting.id, { needsSeed: usingDefaultCandidates })
      showToast({ type: 'success', title: 'Kandidat dihapus', message: deleting.name })
      setDeleting(null)
    } catch (error) {
      failToast('Gagal menghapus kandidat', error)
    } finally {
      setBusy(false)
    }
  }

  const sections = [
    { type: 'ai', icon: Users, list: aiCandidates, addLabel: 'Tambah Calon AI' },
    { type: 'kabem', icon: Crown, list: kabemCandidates, addLabel: 'Tambah Paslon Kabem' },
  ]

  return (
    <div className="space-y-6">
      {usingDefaultCandidates && (
        <p role="note" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-gold">
          Saat ini yang tampil adalah <strong>data contoh bawaan</strong>. Saat Anda menyimpan perubahan
          pertama, data contoh otomatis disalin ke database sehingga semuanya bisa Anda ubah atau hapus.
        </p>
      )}

      {sections.map(({ type, icon, list, addLabel }) => (
        <Card
          key={type}
          icon={icon}
          title={`${CANDIDATE_TYPES[type].label} (${list.length})`}
          actions={
            <button type="button" id={`btn-add-${type}`} onClick={() => openNew(type)} className={btnPrimary}>
              <Plus className="h-4 w-4" aria-hidden="true" /> {addLabel}
            </button>
          }
        >
          {list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gold/30 p-6 text-center text-sm text-gold/70">
              Belum ada kandidat. Pemilih tidak bisa melanjutkan tahap ini sampai ada kandidat.
            </p>
          ) : (
            <ul className="space-y-3">
              {list.map((candidate) => (
                <CandidateRow key={candidate.id} candidate={candidate} onEdit={openEdit} onDelete={setDeleting} />
              ))}
            </ul>
          )}
        </Card>
      ))}

      <Card
        icon={SquareDashedBottom}
        title="Kotak Kosong (Ketua & Wakil Ketua BEM)"
        description="Opsi tanpa foto dan tanpa nomor kandidat bagi pemilih yang tidak berkenan memilih paslon BEM."
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            const cleanDesc = kkDescription.trim()
            if (kkEnabled && cleanDesc.length < 10) {
              showToast({
                type: 'error',
                title: 'Keterangan terlalu singkat',
                message: 'Isi keterangan Kotak Kosong minimal 10 karakter.',
              })
              return
            }
            setSavingKk(true)
            try {
              await saveKotakKosongSettings({
                enabled: kkEnabled,
                description: cleanDesc || DEFAULT_KOTAK_KOSONG.tagline,
              })
              showToast({
                type: 'success',
                title: 'Pengaturan Kotak Kosong disimpan',
                message: kkEnabled ? 'Kotak Kosong tampil di bilik suara BEM.' : 'Kotak Kosong disembunyikan.',
              })
            } catch (error) {
              failToast('Gagal menyimpan pengaturan Kotak Kosong', error)
            } finally {
              setSavingKk(false)
            }
          }}
          className="space-y-4"
        >
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gold/20 bg-bean/50 p-3.5">
            <input
              type="checkbox"
              checked={kkEnabled}
              onChange={(event) => setKkEnabled(event.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            <span className="text-sm font-semibold text-white">
              Tampilkan opsi Kotak Kosong pada pemilihan Ketua &amp; Wakil Ketua BEM
            </span>
          </label>

          <Field label="Keterangan Kotak Kosong" htmlFor="kk-description">
            <textarea
              id="kk-description"
              rows={2}
              maxLength={300}
              value={kkDescription}
              onChange={(event) => setKkDescription(event.target.value)}
              disabled={!kkEnabled}
              className={textareaClass}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setKkDescription(DEFAULT_KOTAK_KOSONG.tagline)}
              disabled={!kkEnabled}
              className="text-xs font-semibold text-gold/80 underline-offset-2 hover:text-gold hover:underline disabled:opacity-40"
            >
              Gunakan teks bawaan
            </button>
            <button
              type="submit"
              id="btn-save-kotak-kosong"
              disabled={
                savingKk ||
                (kkEnabled === kotakKosongConfig.enabled &&
                  kkDescription.trim() === kotakKosongConfig.description)
              }
              className={btnPrimary}
            >
              {savingKk && <Spinner className="h-4 w-4" />} Simpan Kotak Kosong
            </button>
          </div>
        </form>
      </Card>

      <p className="text-xs text-gold/55">
        Menghapus kandidat yang sudah menerima suara akan menghilangkan baris hasilnya dari grafik. Lakukan
        perubahan kandidat <em>sebelum</em> pemungutan suara dimulai.
      </p>

      {editing && (
        <CandidateEditor
          key={editing.id}
          initial={editing.form}
          isNew={editing.isNew}
          saving={busy}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          showToast={showToast}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        busy={busy}
        title="Hapus kandidat ini?"
        message={deleting ? `${deleting.number} · ${deleting.name}` : ''}
        confirmLabel="Hapus Kandidat"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      >
        Kandidat tidak akan tampil lagi di bilik suara. Tindakan ini tidak dapat dibatalkan.
      </ConfirmDialog>
    </div>
  )
}
