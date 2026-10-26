import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock,
  Headphones,
  LayoutGrid,
  PieChart as PieChartIcon,
  ScrollText,
  Vote,
} from 'lucide-react'
import { useElection } from '../context/electionContext'
import { firstName, percent } from '../utils/format'

const CATEGORY_COLORS = [
  '#0284C7', // Sky Blue (S1 akt 26)
  '#EA580C', // Orange Flame (S1 akt 25)
  '#059669', // Emerald Green (S1 akt 24)
  '#7C3AED', // Royal Violet (S1 akt 23)
  '#E11D48', // Crimson Rose (S2 akt 26)
  '#D97706', // Golden Amber (S2 akt 25)
  '#0891B2', // Cyan Teal (S3 akt 26)
  '#DB2777', // Magenta Pink (S3 akt 25)
  '#65A30D', // Lime Green (Profesi)
  '#4F46E5', // Indigo (RPL akt 26)
  '#F59E0B', // Bright Gold (RPL akt 25)
  '#0D9488', // Teal Mint (RPL akt 24)
  '#C026D3', // Fuchsia
  '#2563EB', // Sapphire Blue
  '#CA8A04', // Dark Mustard
  '#16A34A', // Forest Green
]

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-xl border border-gold/40 bg-card-dark/95 p-3 shadow-2xl shadow-black/80 backdrop-blur text-xs">
      <p className="font-extrabold text-gold text-sm">{data.label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-black text-white">{data.pct}%</span>
        <span className="text-gold/75">partisipasi</span>
      </div>
      <p className="mt-1 border-t border-gold/15 pt-1 text-[11px] text-gold/80">
        <strong className="text-white">{data.voted}</strong> dari{' '}
        <strong className="text-white">{data.total}</strong> pemilih telah memilih
      </p>
    </div>
  )
}

function CategoryPieTooltip({ active, payload, grandVoted = 0 }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  const shareOfVoted = grandVoted > 0 && data.voted > 0 ? percent(data.voted, grandVoted) : 0
  return (
    <div className="min-w-[220px] rounded-xl border border-gold/40 bg-card-dark/95 p-3.5 shadow-2xl shadow-black/90 backdrop-blur text-xs">
      <div className="flex items-center gap-2.5">
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full shadow"
          style={{ backgroundColor: data.color || payload[0].fill }}
        />
        <p className="font-extrabold text-gold text-sm truncate">{data.name || data.label}</p>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg border border-gold/15 bg-bean/70 p-2">
        <div>
          <p className="text-[10px] text-gold/70">Pemilih Memilih</p>
          <p className="text-base font-extrabold text-white">
            {data.voted} <span className="text-[11px] font-normal text-gold/60">/ {data.total} DPT</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gold/70">Partisipasi</p>
          <p className="text-base font-extrabold text-accent">{data.pct}%</p>
        </div>
      </div>

      {grandVoted > 0 && (
        <p className="mt-2 border-t border-gold/15 pt-1.5 text-[11px] text-gold/85">
          Kontribusi: <strong className="text-white">{shareOfVoted}%</strong> dari {grandVoted} total suara masuk
        </p>
      )}
    </div>
  )
}

function TotalDonutTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-xl border border-gold/40 bg-card-dark/95 p-3 shadow-2xl shadow-black/80 backdrop-blur text-xs">
      <p className="font-extrabold text-gold text-sm">{data.name}</p>
      <p className="mt-1 text-sm font-bold text-white">
        {data.value} pemilih ({data.pct}%)
      </p>
    </div>
  )
}

export default function DashboardPage({ voter, stats, statsReady, onNavigate }) {
  const { angkatan, timeline, appName } = useElection()
  const [filter, setFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState('pie') // 'pie' | 'bar' | 'grid'
  const [pieMetric, setPieMetric] = useState('voted') // 'voted' | 'pct'

  const rows = useMemo(() => {
    return angkatan.map((a, index) => {
      const entry = stats?.[a.key] || stats?.[a.label]
      const total = entry?.total ?? 0
      const voted = entry?.voted ?? 0

      const labelUpper = (a.label || '').toUpperCase()
      let group = 'LAINNYA'
      if (labelUpper.includes('S1')) group = 'S1'
      else if (labelUpper.includes('S2')) group = 'S2'
      else if (labelUpper.includes('S3')) group = 'S3'
      else if (labelUpper.includes('RPL')) group = 'RPL'
      else if (labelUpper.includes('PROFESI') || labelUpper.includes('PROF')) group = 'Profesi'

      return {
        ...a,
        group,
        total,
        voted,
        pct: percent(voted, total),
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }
    })
  }, [angkatan, stats])

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)
  const grandVoted = rows.reduce((sum, r) => sum + r.voted, 0)

  const groups = useMemo(() => {
    const list = []
    const seen = new Set()
    for (const r of rows) {
      if (!seen.has(r.group)) {
        seen.add(r.group)
        list.push(r.group)
      }
    }
    return list
  }, [rows])

  const displayedRows = filter === 'ALL' ? rows : rows.filter((r) => r.group === filter)

  const hasAnyVote = grandVoted > 0

  const totalDonutData = useMemo(() => {
    const voted = grandVoted
    const remaining = Math.max(0, grandTotal - grandVoted)
    const votedPct = percent(voted, grandTotal)
    const remPct = grandTotal > 0 ? 100 - votedPct : 0
    return [
      { name: 'Sudah Memilih', value: voted, pct: votedPct, fill: '#BA3D03' },
      { name: 'Belum Memilih', value: remaining, pct: remPct, fill: '#2A0B02' },
    ]
  }, [grandVoted, grandTotal])

  const categoryPieData = useMemo(() => {
    return displayedRows.map((r) => {
      const val =
        pieMetric === 'voted'
          ? hasAnyVote
            ? r.voted > 0
              ? r.voted
              : 0.0001
            : r.total > 0
              ? r.total
              : 1
          : r.pct > 0
            ? r.pct
            : 0.0001
      return {
        name: r.label,
        label: r.label,
        value: val,
        voted: r.voted,
        total: r.total,
        pct: r.pct,
        color: r.color,
      }
    })
  }, [displayedRows, hasAnyVote, pieMetric])

  return (
    <div className="mx-auto max-w-7xl animate-rise space-y-8 px-4 py-8 lg:px-8 lg:py-10">
      {/* Hero Banner */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-accent p-6 shadow-2xl shadow-black/40 sm:p-10"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-card-dark/70 px-3 py-1 text-xs font-bold text-gold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
              Pemungutan Suara Sedang Berlangsung
            </span>
            <h1 id="hero-title" className="mt-4 text-3xl font-extrabold text-white sm:text-5xl">
              Halo, {firstName(voter.nama)}!
            </h1>
            <p className="mt-3 max-w-2xl text-base font-medium text-white/90">
              Selamat datang di {appName}. Gunakan hak suara Anda untuk memilih Anggota
              Independen dan Ketua/Wakil Ketua BEM. Pilihan Anda rahasia dan menentukan arah kampus.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {voter.hasVoted ? (
                <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gold/40 bg-card-dark/90 px-5 text-sm font-bold text-gold shadow-lg shadow-black/30">
                  <CheckCircle2 className="h-5 w-5 text-gold" aria-hidden="true" />
                  Hak Suara Sudah Digunakan
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-start-voting"
                  onClick={() => onNavigate('voting')}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-card-dark px-6 text-sm font-bold text-gold shadow-lg shadow-black/30 transition-colors hover:bg-black"
                >
                  <Vote className="h-5 w-5" aria-hidden="true" /> Mulai Memilih
                </button>
              )}
              <button
                type="button"
                id="btn-read-sop"
                onClick={() => onNavigate('sop')}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/60 px-5 text-sm font-bold text-white transition-colors hover:bg-white/15"
              >
                <ScrollText className="h-5 w-5" aria-hidden="true" /> SOP Pemilihan
              </button>
              <button
                type="button"
                id="btn-contact-person"
                onClick={() => onNavigate('contact')}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/60 px-5 text-sm font-bold text-white transition-colors hover:bg-white/15"
              >
                <Headphones className="h-5 w-5" aria-hidden="true" /> Narahubung (CP)
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-center lg:w-72">
            <div className="rounded-xl bg-card-dark/70 p-4">
              <dt className="text-xs font-semibold text-gold/80">Total Pemilih</dt>
              <dd className="mt-1 text-3xl font-extrabold text-gold">{grandTotal}</dd>
            </div>
            <div className="rounded-xl bg-card-dark/70 p-4">
              <dt className="text-xs font-semibold text-gold/80">Sudah Memilih</dt>
              <dd className="mt-1 text-3xl font-extrabold text-gold">{grandVoted}</dd>
            </div>
            <div className="col-span-2 rounded-xl bg-card-dark/70 p-4">
              <dt className="text-xs font-semibold text-gold/80">Partisipasi Keseluruhan</dt>
              <dd className="mt-1 text-3xl font-extrabold text-gold">
                {percent(grandVoted, grandTotal)}%
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Statistik per angkatan (Ringkas & Efisien Ruang) */}
      <section aria-labelledby="stats-title" className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="stats-title" className="text-xl font-bold text-gold sm:text-2xl">
              Partisipasi Pemilih per Angkatan
            </h2>
            <p className="text-xs text-gold/70">
              Diperbarui secara real-time ({rows.length} kategori pemilih).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!statsReady && <span className="text-xs text-gold/60">Memuat statistik…</span>}

            {/* Filter pills */}
            {groups.length > 1 && (
              <div
                role="tablist"
                aria-label="Filter kategori pemilih"
                className="flex flex-wrap items-center gap-1 rounded-xl border border-gold/20 bg-card-dark/80 p-1"
              >
                <button
                  type="button"
                  onClick={() => setFilter('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    filter === 'ALL'
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-gold/70 hover:bg-gold/10 hover:text-gold'
                  }`}
                >
                  Semua ({rows.length})
                </button>
                {groups.map((g) => {
                  const count = rows.filter((r) => r.group === g).length
                  const isActive = filter === g
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFilter(g)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-gold/70 hover:bg-gold/10 hover:text-gold'
                      }`}
                    >
                      {g} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {/* View Mode Toggle: Pie Chart vs Bar Chart vs Kartu */}
            <div className="flex items-center gap-1 rounded-xl border border-gold/20 bg-card-dark/80 p-1">
              <button
                type="button"
                onClick={() => setViewMode('pie')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  viewMode === 'pie'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-gold/70 hover:bg-gold/10 hover:text-gold'
                }`}
                title="Tampilan Pie Chart (Distribusi & Partisipasi)"
              >
                <PieChartIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pie Chart</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('bar')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  viewMode === 'bar'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-gold/70 hover:bg-gold/10 hover:text-gold'
                }`}
                title="Tampilan Grafik Bar"
              >
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Grafik Bar</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-gold/70 hover:bg-gold/10 hover:text-gold'
                }`}
                title="Tampilan Kartu Ringkas"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kartu</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: Pie Chart (Dual: Donut Total Partisipasi + Pie Distribusi Suara Angkatan) */}
        {viewMode === 'pie' ? (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Donut Chart 1: Partisipasi Keseluruhan */}
            <div className="flex flex-col justify-between rounded-2xl border border-gold/25 bg-card-dark p-5 shadow-xl shadow-black/30 lg:col-span-2">
              <div>
                <h3 className="text-base font-bold text-gold">Partisipasi Keseluruhan</h3>
                <p className="text-xs text-gold/70">Rasio total pemilih yang telah menggunakan hak suara</p>
              </div>

              <div className="relative my-3 flex h-60 w-full items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={totalDonutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="65%"
                      outerRadius="88%"
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={grandVoted > 0 && grandVoted < grandTotal ? 3 : 0}
                      stroke="#2A0B02"
                      strokeWidth={2}
                    >
                      {totalDonutData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<TotalDonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text inside Donut */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-gold sm:text-4xl">
                    {percent(grandVoted, grandTotal)}%
                  </span>
                  <span className="text-xs font-semibold text-gold/70">Partisipasi</span>
                  <span className="mt-0.5 font-mono text-[11px] text-white/80">
                    {grandVoted}/{grandTotal}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-gold/15 pt-3 text-xs">
                <div className="flex items-center gap-2 rounded-lg bg-bean/60 p-2">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-brand" />
                  <div className="truncate leading-tight">
                    <p className="text-[10px] text-gold/70">Sudah Memilih</p>
                    <p className="font-bold text-white">{grandVoted} ({percent(grandVoted, grandTotal)}%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-bean/60 p-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border border-gold/40 bg-card-dark" />
                  <div className="truncate leading-tight">
                    <p className="text-[10px] text-gold/70">Belum Memilih</p>
                    <p className="font-bold text-gold/90">{Math.max(0, grandTotal - grandVoted)} ({100 - percent(grandVoted, grandTotal)}%)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie Chart 2: Distribusi Partisipasi per Angkatan */}
            <div className="flex flex-col justify-between rounded-2xl border border-gold/25 bg-card-dark p-5 shadow-xl shadow-black/30 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-gold">Distribusi Suara per Kategori</h3>
                  <p className="text-xs text-gold/70">
                    {pieMetric === 'voted'
                      ? hasAnyVote
                        ? `Persebaran ${grandVoted} pemilih yang sudah memilih (${displayedRows.length} kategori)`
                        : `Proporsi kuota DPT (${displayedRows.length} kategori — belum ada suara masuk)`
                      : `Tingkat persentase partisipasi (${displayedRows.length} kategori)`}
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-gold/20 bg-bean/60 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPieMetric('voted')}
                    className={`rounded px-2.5 py-0.5 font-bold transition-all ${
                      pieMetric === 'voted' ? 'bg-brand text-white shadow-sm' : 'text-gold/70 hover:text-gold'
                    }`}
                  >
                    Suara Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setPieMetric('pct')}
                    className={`rounded px-2.5 py-0.5 font-bold transition-all ${
                      pieMetric === 'pct' ? 'bg-brand text-white shadow-sm' : 'text-gold/70 hover:text-gold'
                    }`}
                  >
                    % Partisipasi
                  </button>
                </div>
              </div>

              <div className="my-2 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="40%"
                      outerRadius="80%"
                      paddingAngle={hasAnyVote ? 2 : 1}
                      stroke="#2A0B02"
                      strokeWidth={1.5}
                    >
                      {categoryPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CategoryPieTooltip grandVoted={grandVoted} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Scrollable / Compact legend grid */}
              <div className="max-h-36 overflow-y-auto border-t border-gold/15 pr-1 pt-2.5">
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  {categoryPieData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between gap-1.5 rounded-lg border border-gold/15 bg-bean/60 px-2.5 py-1.5 shadow-sm transition-colors hover:border-gold/40"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full shadow-md"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate text-xs font-semibold text-white">{entry.name}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-bold text-gold">{entry.voted}</span>
                        <span className="ml-1 font-mono text-[10px] text-gold/70">({entry.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'bar' ? (
          /* View Mode 2: Grafik Bar (Paling ringkas, semua 12 kategori masuk dalam 1 frame layar presentasi) */
          <div className="rounded-2xl border border-gold/25 bg-card-dark p-4 shadow-xl shadow-black/30 sm:p-6">
            <div className="h-64 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayedRows}
                  margin={{ top: 15, right: 15, left: -20, bottom: displayedRows.length > 6 ? 28 : 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(232,197,128,0.12)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#E8C580"
                    tick={{ fontSize: 11, fill: '#E8C580' }}
                    interval={0}
                    angle={displayedRows.length > 6 ? -25 : 0}
                    textAnchor={displayedRows.length > 6 ? 'end' : 'middle'}
                    height={displayedRows.length > 6 ? 42 : 24}
                  />
                  <YAxis
                    stroke="#E8C580"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fontSize: 11, fill: '#E8C580' }}
                    unit="%"
                  />
                  <RechartsTooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: 'rgba(232,197,128,0.08)' }}
                  />
                  <Bar
                    dataKey="pct"
                    name="Partisipasi"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {displayedRows.map((row) => (
                      <Cell key={row.key} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gold/15 pt-3 text-xs text-gold/70">
              <span className="font-semibold">
                Menampilkan <strong>{displayedRows.length}</strong> kategori pemilih
              </span>
              <span className="text-[11px] text-gold/60">
                Arahkan kursor / sentuh bar untuk melihat detail pemilih
              </span>
            </div>
          </div>
        ) : (
          /* View Mode 2: Dense Compact Grid (4 kolom di desktop) */
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
            {displayedRows.map((row) => (
              <article
                key={row.key}
                className="group rounded-xl border border-gold/20 bg-card-dark/85 p-3.5 shadow-md shadow-black/25 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:bg-card-dark"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: row.color }}
                    />
                    <p className="truncate text-xs font-bold text-white transition-colors group-hover:text-gold sm:text-sm">
                      {row.label}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-gold/30 bg-gold/15 px-1.5 py-0.5 text-[11px] font-black text-gold">
                    {row.pct}%
                  </span>
                </div>

                <div
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={row.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Partisipasi ${row.label}`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all duration-700"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-gold/70">
                  <span className="font-medium">
                    <strong className="text-gold">{row.voted}</strong>/{row.total}
                  </span>
                  <span className="text-[10px] text-gold/50">pemilih</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Panel pendukung: timeline & kuorum */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gold/25 bg-card-dark p-6 lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gold">
            <CalendarClock className="h-5 w-5" aria-hidden="true" /> Timeline Pemilihan
          </h2>
          <ol className="space-y-4">
            {timeline.map((item) => (
              <li key={item.id} className="flex items-center gap-4">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    item.status === 'done'
                      ? 'bg-gold text-card-dark'
                      : item.status === 'active'
                        ? 'bg-brand text-white ring-4 ring-brand/30'
                        : 'border border-gold/25 text-gold/40'
                  }`}
                >
                  {item.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  ) : item.status === 'active' ? (
                    <CircleDot className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-bold ${
                      item.status === 'upcoming' ? 'text-gold/50' : 'text-white'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-gold/60">{item.date}</p>
                </div>
                {item.status === 'active' && (
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-card-dark">
                    Sedang Berlangsung
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <aside className="flex flex-col justify-between rounded-2xl border border-gold/25 bg-card-dark p-6">
          <div>
            <h2 className="text-lg font-bold text-gold">Status Anda</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gold/60">Nama</dt>
                <dd className="text-right font-semibold text-white">{voter.nama}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gold/60">NPM</dt>
                <dd className="font-mono font-semibold text-white">{voter.npm}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gold/60">Kategori</dt>
                <dd className="font-semibold text-white">{voter.angkatan}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gold/60">Hak Suara</dt>
                <dd className={`font-bold ${voter.hasVoted ? 'text-emerald-400' : 'text-gold'}`}>
                  {voter.hasVoted ? 'Sudah Digunakan' : 'Belum Digunakan'}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-6 rounded-xl bg-bean/70 p-3 text-xs text-gold/70">
            Suara Anda disimpan tanpa identitas. Panitia hanya mencatat bahwa Anda telah memilih,
            bukan siapa yang Anda pilih.
          </p>
        </aside>
      </section>
    </div>
  )
}
