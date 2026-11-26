import { useState } from 'react'
import { CalendarCog, Download, Trash2, TriangleAlert } from 'lucide-react'
import { Spinner } from '../../components/SharedUI'
import { useElection } from '../../context/electionContext'
import { buildAngkatan, buildDefaultDescription } from '../../data'
import {
  downloadElectionBackup,
  resetElectionData,
  resyncStatsFromDpt,
  saveElectionSettings,
} from '../../services/superAdminService'
import { btnDanger, btnGhost, btnPrimary, inputSingle, textareaClass } from './styles'
import { Card, ConfirmDialog, Field } from './ui'

const STEPS = [
  'Unduh cadangan data (laporan kehadiran & rekap suara) tahun berjalan.',
  'Reset data pemilihan untuk menghapus DPT dan kotak suara lama.',
  'Ubah tahun pemilihan (dan nama bila perlu).',
  'Sesuaikan Timeline, SOP, dan Kandidat pada tab masing-masing.',
  'Buka Dashboard Panitia lalu impor DPT baru (.csv).',
]

export default function ElectionSettingsPanel({ showToast }) {
  const election = useElection()
  const [name, setName] = useState(election.name)
  const [year, setYear] = useState(String(election.year))
  const [count, setCount] = useState(String(election.angkatanCount))
  const [description, setDescription] = useState(election.description)
  const [saving, setSaving] = useState(false)

  const [resetOpts, setResetOpts] = useState({ dpt: true, votes: true })
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [progress, setProgress] = useState('')
  const [backingUp, setBackingUp] = useState(false)

  const yearNumber = Number(year)
  const countNumber = Number(count)
  const dirty =
    name.trim() !== election.name ||
    yearNumber !== election.year ||
    countNumber !== election.angkatanCount ||
    description.trim() !== election.description

  const previewAngkatan =
    Number.isInteger(yearNumber) && yearNumber >= 2000 ? buildAngkatan(yearNumber, countNumber) : []

  const handleSave = async (event) => {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanDescription = description.trim()
    if (cleanName.length < 2 || cleanName.length > 60) {
      showToast({ type: 'error', title: 'Nama tidak valid', message: 'Nama pemilihan 2–60 karakter.' })
      return
    }
    if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2100) {
      showToast({ type: 'error', title: 'Tahun tidak valid', message: 'Masukkan tahun antara 2000 dan 2100.' })
      return
    }
    if (!Number.isInteger(countNumber) || countNumber < 1 || countNumber > 8) {
      showToast({ type: 'error', title: 'Jumlah angkatan tidak valid', message: 'Pilih 1 sampai 8 angkatan.' })
      return
    }
    if (cleanDescription.length < 10 || cleanDescription.length > 500) {
      showToast({
        type: 'error',
        title: 'Deskripsi tidak valid',
        message: 'Deskripsi sambutan harus 10–500 karakter.',
      })
      return
    }

    setSaving(true)
    try {
      const angkatanChanged = yearNumber !== election.year || countNumber !== election.angkatanCount
      await saveElectionSettings({
        name: cleanName,
        year: yearNumber,
        angkatanCount: countNumber,
        description: cleanDescription,
      })
      if (angkatanChanged) await resyncStatsFromDpt(buildAngkatan(yearNumber, countNumber))
      showToast({
        type: 'success',
        title: 'Pengaturan disimpan',
        message: `Pemilihan kini tampil sebagai ${cleanName} ${yearNumber}.`,
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan',
        message:
          error?.code === 'permission-denied'
            ? 'Ditolak oleh aturan keamanan. Pastikan firestore.rules sudah di-deploy dan email Anda terdaftar sebagai Super Admin.'
            : 'Terjadi kesalahan saat menyimpan. Coba lagi.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const { voters, ballots } = await downloadElectionBackup({
        appName: election.appName,
        candidates: election.candidates,
        kotakKosongKabem: election.kotakKosongKabem,
      })
      showToast({
        type: 'success',
        title: 'Cadangan diunduh',
        message: `${voters} pemilih & ${ballots} surat suara. Jika browser meminta izin unduh ganda, izinkan.`,
      })
    } catch {
      showToast({ type: 'error', title: 'Gagal membuat cadangan', message: 'Periksa koneksi lalu coba lagi.' })
    } finally {
      setBackingUp(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    setProgress('Menyiapkan…')
    try {
      const result = await resetElectionData(
        { ...resetOpts, angkatan: election.angkatan },
        (collectionName, done, total) => {
          const label =
            collectionName === 'dpt'
              ? 'Menghapus DPT'
              : collectionName === 'dpt-reset'
                ? 'Mereset status pemilih DPT'
                : 'Menghapus kotak suara'
          setProgress(`${label}: ${done}/${total}`)
        },
      )
      setResetOpen(false)
      showToast({
        type: 'success',
        title: 'Data pemilihan direset',
        message: result.dptReset
          ? `${result.votes} surat suara dihapus dan ${result.dptReset} status pemilih direset.`
          : `${result.dpt} pemilih dan ${result.votes} surat suara dihapus.`,
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Reset gagal',
        message:
          error?.code === 'permission-denied'
            ? 'Ditolak oleh aturan keamanan. Deploy firestore.rules terbaru lalu coba lagi.'
            : 'Sebagian data mungkin belum terhapus. Coba jalankan reset lagi.',
      })
    } finally {
      setResetting(false)
      setProgress('')
    }
  }

  const nothingSelected = !resetOpts.dpt && !resetOpts.votes

  return (
    <div className="space-y-6">
      <Card
        icon={CalendarCog}
        title="Tahun, Nama & Deskripsi Sambutan"
        description="Mengubah tahun akan memperbarui judul di seluruh halaman dan daftar kategori angkatan (4 angkatan terbaru + Magister + Pascasarjana)."
      >
        <form onSubmit={handleSave} className="grid gap-5 sm:grid-cols-3">
          <Field label="Nama pemilihan" htmlFor="set-name">
            <input
              id="set-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              className={inputSingle}
            />
          </Field>
          <Field label="Tahun pemilihan" htmlFor="set-year">
            <input
              id="set-year"
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className={inputSingle}
            />
          </Field>
          <Field label="Jumlah angkatan" htmlFor="set-count" hint="Angkatan terbaru yang masuk statistik.">
            <input
              id="set-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={8}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className={inputSingle}
            />
          </Field>

          <div className="sm:col-span-3">
            <p className="text-xs font-semibold text-gold/70">Pratinjau kategori pemilih</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {previewAngkatan.map((a) => (
                <li key={a.key} className="rounded-full border border-gold/30 px-3 py-1 text-xs font-bold text-gold">
                  {a.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold text-gold">
              Judul aplikasi: <span className="text-white">{name.trim() || '—'} {year || '—'}</span>
            </p>
          </div>

          <Field
            label="Deskripsi sambutan dashboard"
            htmlFor="set-description"
            hint="Tampil di bagian atas (hero banner) halaman Dashboard pemilih."
            className="sm:col-span-3"
          >
            <textarea
              id="set-description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={textareaClass}
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-gold/60">
              <button
                type="button"
                onClick={() =>
                  setDescription(
                    buildDefaultDescription(`${name.trim() || election.name} ${year || election.year}`),
                  )
                }
                className="font-semibold text-gold/80 underline-offset-2 hover:text-gold hover:underline"
              >
                Gunakan teks bawaan
              </button>
              <span>{description.length}/500</span>
            </div>
          </Field>

          <div className="sm:col-span-3">
            <button type="submit" id="btn-save-settings" disabled={!dirty || saving} className={btnPrimary}>
              {saving && <Spinner className="h-4 w-4" />} Simpan Pengaturan
            </button>
          </div>
        </form>
      </Card>

      <Card
        tone="danger"
        icon={TriangleAlert}
        title="Reset Data Pemilihan (Periode Baru)"
        description="Menghapus data lama agar sistem siap dipakai tahun berikutnya. Tindakan ini permanen dan tidak bisa dibatalkan."
      >
        <fieldset className="space-y-3">
          <legend className="sr-only">Data yang akan dihapus</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold/20 bg-bean/50 p-3">
            <input
              type="checkbox"
              checked={resetOpts.dpt}
              onChange={(event) => setResetOpts((prev) => ({ ...prev, dpt: event.target.checked }))}
              className="mt-1 h-4 w-4 accent-brand"
            />
            <span className="text-sm text-gold/90">
              <strong className="text-gold">Hapus seluruh DPT</strong> (termasuk yang sudah memilih) dan
              nolkan statistik kehadiran per angkatan.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold/20 bg-bean/50 p-3">
            <input
              type="checkbox"
              checked={resetOpts.votes}
              onChange={(event) => setResetOpts((prev) => ({ ...prev, votes: event.target.checked }))}
              className="mt-1 h-4 w-4 accent-brand"
            />
            <span className="text-sm text-gold/90">
              <strong className="text-gold">Kosongkan kotak suara</strong> (hapus seluruh surat suara,
              reset status memilih di DPT, dan nolkan perolehan suara).
            </span>
          </label>
        </fieldset>
        {resetOpts.votes !== resetOpts.dpt && (
          <p role="note" className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-gold">
            Disarankan menghapus DPT <em>dan</em> kotak suara sekaligus. Jika hanya salah satu, jumlah pemilih
            yang tercatat memilih dan jumlah surat suara bisa tidak sinkron.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleBackup} disabled={backingUp} className={btnGhost}>
            {backingUp ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Unduh Cadangan Dulu
          </button>
          <button
            type="button"
            id="btn-open-reset"
            onClick={() => setResetOpen(true)}
            disabled={nothingSelected}
            className={btnDanger}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Reset Data Pemilihan…
          </button>
        </div>
      </Card>

      <Card title="Urutan Menyiapkan Pemilihan Tahun Berikutnya">
        <ol className="space-y-2.5">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-gold/90">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        danger
        busy={resetting}
        title="Reset data pemilihan?"
        message="Data berikut akan dihapus permanen dari database:"
        requireText="HAPUS"
        confirmLabel={resetting ? 'Menghapus…' : 'Hapus Permanen'}
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      >
        <ul className="list-disc space-y-1 pl-5">
          {resetOpts.dpt && <li>Seluruh Daftar Pemilih Tetap (DPT) &amp; statistik angkatan</li>}
          {resetOpts.votes && <li>Seluruh surat suara di kotak suara</li>}
        </ul>
        {resetting && progress && <p className="mt-3 font-semibold text-gold">{progress}</p>}
      </ConfirmDialog>
    </div>
  )
}
