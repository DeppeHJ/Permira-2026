import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Upload,
  UserCheck,
  Users,
  UserX,
  Vote,
} from 'lucide-react'
import { BrandLogo, Spinner } from '../components/SharedUI'
import { CSV_MAX_BYTES } from '../config'
import { useElection } from '../context/electionContext'
import {
  downloadAttendanceReport,
  downloadDptTemplate,
  importDpt,
  subscribeDpt,
  subscribeVotes,
  syncStats,
  tallyVotes,
} from '../services/adminService'
import { parseDptCsv } from '../utils/dpt'
import { formatDateTime, percent } from '../utils/format'

const CHART_COLORS = ['#BA3D03', '#E48523', '#E8C580']
const CATEGORY_COLORS = [
  '#0284C7',
  '#EA580C',
  '#059669',
  '#7C3AED',
  '#E11D48',
  '#D97706',
  '#0891B2',
  '#DB2777',
  '#65A30D',
  '#4F46E5',
  '#F59E0B',
  '#0D9488',
  '#C026D3',
  '#2563EB',
  '#CA8A04',
  '#16A34A',
]
const PAGE_SIZE = 10

const tooltipStyle = {
  backgroundColor: '#2A0B02',
  border: '1px solid rgba(232,197,128,0.4)',
  borderRadius: 12,
  color: '#E8C580',
}

function KpiCard({ icon: Icon, label, value, hint, tone = 'dark' }) {
  const isGold = tone === 'gold'
  return (
    <article
      className={`rounded-2xl p-5 shadow-xl shadow-black/30 ${
        isGold ? 'bg-gold text-card-dark' : 'border border-gold/25 bg-card-dark text-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${isGold ? 'text-card-dark/80' : 'text-gold/80'}`}>{label}</p>
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg ${
            isGold ? 'bg-card-dark text-gold' : 'bg-brand text-white'
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 text-4xl font-extrabold ${isGold ? '' : 'text-gold'}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs font-medium ${isGold ? 'text-card-dark/70' : 'text-gold/60'}`}>{hint}</p>}
    </article>
  )
}

export default function AdminDashboardPage({ user, onLogout, showToast, isSuper = false }) {
  const { angkatan, aiCandidates, kabemCandidates, appName } = useElection()
  const [records, setRecords] = useState([])
  const [dptReady, setDptReady] = useState(false)
  const [ballots, setBallots] = useState([])
  const [votesReady, setVotesReady] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [syncing, setSyncing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [aiChartType, setAiChartType] = useState('pie')

  useEffect(() => {
    const onError = (error) =>
      setLoadError(
        error?.code === 'permission-denied'
          ? 'Akses data ditolak. Pastikan email Anda terdaftar di firestore.rules.'
          : 'Gagal memuat data real-time. Periksa koneksi internet.',
      )
    const unsubDpt = subscribeDpt((data) => {
      setRecords(data)
      setDptReady(true)
    }, onError)
    const unsubVotes = subscribeVotes((data) => {
      setBallots(data)
      setVotesReady(true)
    }, onError)
    return () => {
      unsubDpt()
      unsubVotes()
    }
  }, [])

  /* ------------------------------ Agregasi ------------------------------ */
  const totals = useMemo(() => {
    const voted = records.filter((r) => r.hasVoted).length
    return { total: records.length, voted, notVoted: records.length - voted }
  }, [records])

  const perAngkatan = useMemo(
    () =>
      angkatan.map((a) => {
        const group = records.filter(
          (r) =>
            r.angkatan === a.key ||
            r.angkatan === a.label ||
            String(r.angkatan).toLowerCase() === a.label.toLowerCase() ||
            String(r.angkatan).toLowerCase() === a.key.toLowerCase(),
        )
        const voted = group.filter((r) => r.hasVoted).length
        return { ...a, total: group.length, voted, pct: percent(voted, group.length) }
      }),
    [records, angkatan],
  )

  const tally = useMemo(() => tallyVotes(ballots), [ballots])
  const kabemData = kabemCandidates.map((c) => ({
    name: `Paslon ${c.number}`,
    detail: c.name,
    value: tally.kabem[c.id] || 0,
  }))
  const aiData = aiCandidates.map((c) => ({
    name: `${c.number} ${c.name.split(' ')[0]}`,
    detail: c.name,
    suara: tally.ai[c.id] || 0,
  }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        r.npm.toLowerCase().includes(q) ||
        String(r.nama).toLowerCase().includes(q) ||
        String(r.email).toLowerCase().includes(q),
    )
  }, [records, query])
  const sorted = useMemo(() => [...filtered].sort((a, b) => a.npm.localeCompare(b.npm)), [filtered])
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  /* ------------------------------ Unggah CSV ----------------------------- */
  const handleFile = useCallback(
    async (file) => {
      if (!file) return
      if (!/\.csv$/i.test(file.name)) {
        showToast({ type: 'error', title: 'Format tidak didukung', message: 'Unggah berkas berekstensi .csv.' })
        return
      }
      if (file.size > CSV_MAX_BYTES) {
        showToast({ type: 'error', title: 'Berkas terlalu besar', message: 'Ukuran maksimal 2 MB.' })
        return
      }
      const text = await file.text()
      setPreview({ name: file.name, ...parseDptCsv(text, angkatan) })
    },
    [showToast, angkatan],
  )

  const existingNpm = useMemo(() => new Set(records.map((r) => r.npm)), [records])
  const newCount = preview?.valid.filter((r) => !existingNpm.has(r.npm)).length ?? 0
  const updateCount = (preview?.valid.length ?? 0) - newCount

  const handleImport = async () => {
    if (!preview || preview.valid.length === 0 || importing || !dptReady) return
    setImporting(true)
    setProgress({ done: 0, total: preview.valid.length })
    try {
      await importDpt(preview.valid, records, (done, total) => setProgress({ done, total }), angkatan)
      showToast({
        type: 'success',
        title: 'Impor DPT berhasil',
        message: `${newCount} pemilih baru, ${updateCount} diperbarui.`,
      })
      setPreview(null)
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Impor DPT gagal',
        message:
          error?.code === 'permission-denied'
            ? 'Akses ditolak oleh aturan keamanan database.'
            : 'Terjadi kesalahan saat menulis ke database. Coba lagi.',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncStats(records, angkatan)
      showToast({ type: 'success', title: 'Statistik disinkronkan', message: 'Data publik per angkatan telah diperbarui.' })
    } catch {
      showToast({ type: 'error', title: 'Sinkronisasi gagal', message: 'Coba lagi beberapa saat.' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-bean">
      <header className="sticky top-0 z-40 border-b border-gold/12 bg-bean/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          <BrandLogo subtitle="Dashboard Panitia" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-xs text-gold/60">Masuk sebagai</p>
              <p className="text-sm font-semibold text-gold">{user.email}</p>
            </div>
            {isSuper && (
              <a
                href="#/superadmin"
                id="link-super-admin"
                className="flex h-11 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-card-dark transition-colors hover:bg-white"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Panel Super Admin</span>
              </a>
            )}
            <button
              type="button"
              id="btn-admin-logout"
              onClick={onLogout}
              className="flex h-11 items-center gap-2 rounded-xl border border-gold/25 px-4 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-card-dark"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl animate-rise space-y-8 px-4 py-8 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gold sm:text-4xl">Rekapitulasi Real-Time</h1>
            <p className="mt-1 text-sm text-gold/70">
              Perolehan suara dan kehadiran pemilih {appName} diperbarui otomatis.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSync}
              disabled={!dptReady || syncing}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gold/30 px-4 text-sm font-bold text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
            >
              {syncing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Sinkronkan Statistik
            </button>
            <button
              type="button"
              id="btn-download-report"
              onClick={() => downloadAttendanceReport(records, appName)}
              disabled={!dptReady || records.length === 0}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Unduh Laporan Kehadiran (.csv)
            </button>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="rounded-xl border border-brand bg-brand/20 p-4 text-sm font-semibold text-gold">
            {loadError}
          </div>
        )}

        {/* KPI */}
        <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <KpiCard icon={Users} label="Total DPT" value={totals.total} hint="Pemilih terdaftar" tone="gold" />
          <KpiCard icon={UserCheck} label="Sudah Memilih" value={totals.voted} hint="Hak suara digunakan" />
          <KpiCard icon={UserX} label="Belum Memilih" value={totals.notVoted} hint="Masih memiliki hak suara" />
          <KpiCard
            icon={Vote}
            label="Partisipasi"
            value={`${percent(totals.voted, totals.total)}%`}
            hint={`${tally.total} surat suara di kotak suara`}
            tone="gold"
          />
        </section>

        {/* Grafik */}
        <section aria-label="Grafik perolehan suara" className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gold/25 bg-card-dark p-6">
            <h2 className="text-lg font-bold text-gold">Perolehan Suara Ketua &amp; Wakil BEM</h2>
            <p className="text-xs text-gold/60">{votesReady ? `${tally.total} suara masuk` : 'Memuat…'}</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kabemData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={tally.total > 0 ? 3 : 0}
                    stroke="#2A0B02"
                    label={({ value }) => (value > 0 ? value : '')}
                  >
                    {kabemData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#E8C580' }} />
                  <Legend wrapperStyle={{ color: '#E8C580' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-gold/70">
              {kabemData.map((d) => (
                <li key={d.name}>
                  <strong className="text-gold">{d.name}:</strong> {d.detail} — {d.value} suara (
                  {percent(d.value, tally.total)}%)
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gold/25 bg-card-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gold">Perolehan Suara Anggota Independen</h2>
                <p className="text-xs text-gold/60">{votesReady ? `${tally.total} suara masuk` : 'Memuat…'}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-gold/20 bg-bean/60 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAiChartType('pie')}
                  className={`rounded px-2.5 py-0.5 font-bold transition-all ${
                    aiChartType === 'pie' ? 'bg-brand text-white shadow-sm' : 'text-gold/70 hover:text-gold'
                  }`}
                >
                  Pie
                </button>
                <button
                  type="button"
                  onClick={() => setAiChartType('bar')}
                  className={`rounded px-2.5 py-0.5 font-bold transition-all ${
                    aiChartType === 'bar' ? 'bg-brand text-white shadow-sm' : 'text-gold/70 hover:text-gold'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>

            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                {aiChartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={aiData}
                      dataKey="suara"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={tally.total > 0 ? 3 : 0}
                      stroke="#2A0B02"
                      label={({ value }) => (value > 0 ? value : '')}
                    >
                      {aiData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#E8C580' }} />
                    <Legend wrapperStyle={{ color: '#E8C580' }} />
                  </PieChart>
                ) : (
                  <BarChart data={aiData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,197,128,0.15)" />
                    <XAxis dataKey="name" stroke="#E8C580" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} stroke="#E8C580" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'rgba(232,197,128,0.08)' }}
                      itemStyle={{ color: '#E8C580' }}
                    />
                    <Bar dataKey="suara" name="Suara" radius={[8, 8, 0, 0]}>
                      {aiData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-gold/70">
              {aiData.map((d) => (
                <li key={d.name}>
                  <strong className="text-gold">{d.name.split(' ')[0]}:</strong> {d.detail} — {d.suara} suara (
                  {percent(d.suara, tally.total)}%)
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Kehadiran per angkatan + Unggah DPT */}
        <section className="grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col rounded-2xl border border-gold/25 bg-card-dark p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gold">Kehadiran per Angkatan</h2>
                <p className="text-xs text-gold/60">{perAngkatan.length} kategori pemilih</p>
              </div>
            </div>
            <ul className="mt-3.5 space-y-1.5">
              {perAngkatan.map((a, index) => {
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                return (
                  <li
                    key={a.key}
                    className="group flex items-center gap-2.5 rounded-lg border border-gold/10 bg-bean/30 px-2.5 py-1.5 transition-all hover:border-gold/30 hover:bg-bean/60"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="w-20 shrink-0 truncate text-xs font-bold text-white transition-colors group-hover:text-gold">
                      {a.label}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gold/15">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${a.pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <strong className="font-bold text-gold">{a.pct}%</strong>
                      <span className="ml-1 text-[10px] text-gold/60 font-mono">
                        ({a.voted}/{a.total})
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-gold/25 bg-card-dark p-6 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gold">Impor DPT Massal (.csv)</h2>
              <button
                type="button"
                onClick={() => downloadDptTemplate(angkatan, appName)}
                className="flex items-center gap-2 text-sm font-semibold text-gold underline-offset-4 hover:underline"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Unduh templat
              </button>
            </div>
            <p className="mt-1 text-xs text-gold/60">
              Kolom: <code className="font-mono">npm, nama, email, angkatan</code>. Pemilih yang sudah ada hanya
              diperbarui datanya; status memilih tidak pernah ditimpa.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                handleFile(e.dataTransfer.files?.[0])
              }}
              className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragging ? 'border-gold bg-gold/10' : 'border-gold/30 bg-bean/50'
              }`}
            >
              <Upload className="h-8 w-8 text-gold" aria-hidden="true" />
              <p className="text-sm text-gold/80">Seret berkas CSV ke sini atau</p>
              <input
                ref={fileInputRef}
                id="dpt-file-input"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  handleFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                Pilih Berkas CSV
              </button>
            </div>

            {preview && (
              <div className="mt-4 space-y-3 rounded-xl border border-gold/25 bg-bean/60 p-4 text-sm">
                <p className="font-bold text-gold">{preview.name}</p>
                {preview.fatal ? (
                  <p role="alert" className="font-semibold text-accent">
                    {preview.fatal}
                  </p>
                ) : (
                  <>
                    <p className="text-gold/90">
                      <strong>{preview.valid.length}</strong> baris valid ({newCount} baru, {updateCount} diperbarui) ·{' '}
                      <strong className={preview.invalid.length ? 'text-accent' : ''}>{preview.invalid.length}</strong>{' '}
                      baris ditolak.
                    </p>
                    {preview.invalid.length > 0 && (
                      <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-card-dark p-3 text-xs text-gold/80">
                        {preview.invalid.slice(0, 50).map((item) => (
                          <li key={item.line}>
                            <strong className="text-accent">Baris {item.line}:</strong> {item.reason}
                          </li>
                        ))}
                        {preview.invalid.length > 50 && <li>…dan {preview.invalid.length - 50} baris lainnya.</li>}
                      </ul>
                    )}
                  </>
                )}

                {importing && (
                  <div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gold/15">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all"
                        style={{ width: `${percent(progress.done, progress.total)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gold/70">
                      Menulis {progress.done} / {progress.total} baris…
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    id="btn-import-dpt"
                    onClick={handleImport}
                    disabled={importing || !dptReady || !preview.valid.length}
                    className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importing ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                    Impor {preview.valid.length} Pemilih
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    disabled={importing}
                    className="h-11 rounded-xl border border-gold/30 px-5 text-sm font-bold text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tabel DPT */}
        <section className="rounded-2xl border border-gold/25 bg-card-dark p-6" aria-labelledby="dpt-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="dpt-title" className="text-lg font-bold text-gold">
              Daftar Pemilih Tetap ({sorted.length})
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder="Cari NPM, nama, atau email"
                aria-label="Cari pemilih"
                className="h-11 w-full rounded-xl border border-gold/25 bg-bean/60 pl-10 pr-3 text-sm text-white placeholder:text-gold/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold/20 text-xs uppercase tracking-wider text-gold/60">
                  <th className="py-3 pr-4 font-semibold">NPM</th>
                  <th className="py-3 pr-4 font-semibold">Nama</th>
                  <th className="py-3 pr-4 font-semibold">Angkatan</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Waktu Memilih</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.npm} className="border-b border-gold/12 text-white/90">
                    <td className="py-3 pr-4 font-mono text-gold">{r.npm}</td>
                    <td className="py-3 pr-4">{r.nama}</td>
                    <td className="py-3 pr-4">{r.angkatan}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          r.hasVoted ? 'bg-gold text-card-dark' : 'border border-gold/30 text-gold/70'
                        }`}
                      >
                        {r.hasVoted ? 'Sudah Memilih' : 'Belum Memilih'}
                      </span>
                    </td>
                    <td className="py-3 text-gold/70">{formatDateTime(r.votedAt)}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gold/60">
                      {dptReady ? 'Belum ada data pemilih. Unggah berkas CSV DPT untuk memulai.' : 'Memuat data DPT…'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gold/70">
            <span>
              Halaman {currentPage + 1} dari {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                aria-label="Halaman sebelumnya"
                className="grid h-10 w-10 place-items-center rounded-lg border border-gold/25 text-gold transition-colors hover:bg-gold/10 disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
                disabled={currentPage >= pageCount - 1}
                aria-label="Halaman berikutnya"
                className="grid h-10 w-10 place-items-center rounded-lg border border-gold/25 text-gold transition-colors hover:bg-gold/10 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
