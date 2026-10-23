import { CalendarClock, CheckCircle2, CircleDot, Clock, ScrollText, Vote } from 'lucide-react'
import { ANGKATAN, ELECTION_TIMELINE } from '../data'
import { firstName, percent } from '../utils/format'

export default function DashboardPage({ voter, stats, statsReady, onNavigate }) {
  const rows = ANGKATAN.map((a) => {
    const entry = stats?.[a.key]
    const total = entry?.total ?? 0
    const voted = entry?.voted ?? 0
    return { ...a, total, voted, pct: percent(voted, total) }
  })
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)
  const grandVoted = rows.reduce((sum, r) => sum + r.voted, 0)

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
              Selamat datang di PERMIRA 2026. Gunakan hak suara Anda untuk memilih Anggota
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
                  onClick={() => onNavigate('voteAI')}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-card-dark px-6 text-sm font-bold text-gold shadow-lg shadow-black/30 transition-colors hover:bg-black"
                >
                  <Vote className="h-5 w-5" aria-hidden="true" /> Mulai Memilih
                </button>
              )}
              <button
                type="button"
                id="btn-read-sop"
                onClick={() => onNavigate('sop')}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/60 px-6 text-sm font-bold text-white transition-colors hover:bg-white/15"
              >
                <ScrollText className="h-5 w-5" aria-hidden="true" /> Baca SOP Pemilihan
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

      {/* Statistik per angkatan */}
      <section aria-labelledby="stats-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="stats-title" className="text-2xl font-bold text-gold">
              Partisipasi Pemilih per Angkatan
            </h2>
            <p className="text-sm text-gold/70">Diperbarui secara real-time.</p>
          </div>
          {!statsReady && <span className="text-xs text-gold/60">Memuat statistik…</span>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {rows.map((row) => (
            <article
              key={row.key}
              className="rounded-2xl bg-gold p-5 text-card-dark shadow-xl shadow-black/30 transition-transform hover:-translate-y-1"
            >
              <p className="text-sm font-bold">{row.label}</p>
              <p className="mt-2 text-3xl font-extrabold">{row.pct}%</p>
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-card-dark/15"
                role="progressbar"
                aria-valuenow={row.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Partisipasi ${row.label}`}
              >
                <div
                  className="h-full rounded-full bg-brand transition-all duration-700"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-card-dark/80">
                {row.voted} dari {row.total} pemilih telah memilih
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Panel pendukung: timeline & kuorum */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gold/25 bg-card-dark p-6 lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gold">
            <CalendarClock className="h-5 w-5" aria-hidden="true" /> Timeline Pemilihan
          </h2>
          <ol className="space-y-4">
            {ELECTION_TIMELINE.map((item) => (
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
