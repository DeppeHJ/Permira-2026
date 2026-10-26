import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  LogIn,
  ScrollText,
  ShieldCheck,
  Vote,
} from 'lucide-react'
import { Stepper } from '../components/SharedUI'
import { useElection } from '../context/electionContext'

export default function SopPage({
  onNavigate,
  voter = null,
  sopAgreed = false,
  onAgreeSop,
}) {
  const { sop: SOP_TABS, appName } = useElection()
  const [activeId, setActiveId] = useState(SOP_TABS[0]?.id || 'umum')
  const [agreed, setAgreed] = useState(sopAgreed)

  const active = SOP_TABS.find((tab) => tab.id === activeId) || SOP_TABS[0]
  const isVoterActive = Boolean(voter && !voter.hasVoted)

  const handleProceed = () => {
    if (!agreed) return
    onAgreeSop?.()
    onNavigate('voteAI')
  }

  return (
    <div className="mx-auto max-w-7xl animate-rise px-4 py-8 lg:px-8 lg:py-10">
      {/* Stepper khusus jika pemilih aktif belum memilih */}
      {isVoterActive && (
        <div className="mb-8 rounded-2xl border border-gold/25 bg-card-dark/70 p-4 sm:p-6 shadow-xl shadow-black/30">
          <Stepper step={1} />
        </div>
      )}

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent">
            <ScrollText className="h-4 w-4" aria-hidden="true" /> Standar Operasional Prosedur
          </p>
          {isVoterActive && (
            <span className="rounded-full border border-gold/30 bg-card-dark px-3 py-0.5 text-xs font-bold text-gold">
              Tahap 1 dari 4 · Ketentuan Wajib Pemilih
            </span>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-extrabold text-gold sm:text-4xl">
          SOP Pemilihan {appName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gold/80 sm:text-base">
          {isVoterActive
            ? 'Baca dan pahami seluruh tata tertib di bawah ini sebelum melanjutkan ke bilik suara.'
            : 'Ketentuan dan tata tertib pemungutan suara yang berlaku bagi seluruh civitas akademika.'}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
        {/* Sidebar tab vertikal */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div
            role="tablist"
            aria-label="Kategori SOP"
            aria-orientation="vertical"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-gold/25 bg-card-dark p-2 lg:flex-col lg:overflow-visible"
          >
            {SOP_TABS.map((tab) => {
              const isActive = tab.id === activeId
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`sop-tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls="sop-panel"
                  onClick={() => setActiveId(tab.id)}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-brand text-white shadow-lg shadow-brand/30'
                      : 'text-gold/80 hover:bg-gold/10 hover:text-gold'
                  }`}
                >
                  {tab.label}
                  <ChevronRight className="hidden h-4 w-4 lg:block" aria-hidden="true" />
                </button>
              )
            })}
          </div>

          {/* Card Aksi Desktop */}
          {isVoterActive ? (
            <div className="hidden rounded-2xl border-2 border-gold/30 bg-card-dark p-5 shadow-xl shadow-black/30 lg:block">
              <div className="flex items-center gap-2 text-gold">
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
                <p className="text-sm font-bold">Verifikasi Pemahaman</p>
              </div>
              <p className="mt-2 text-xs text-gold/70 leading-relaxed">
                Centang persetujuan di bawah untuk membuka akses ke bilik suara.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-gold/20 bg-bean/60 p-3 text-xs font-semibold text-white/90 transition-colors hover:border-gold/40">
                <input
                  type="checkbox"
                  id="check-sop-agree-desktop"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gold/40 bg-bean accent-brand cursor-pointer"
                />
                <span>Saya telah membaca dan memahami ketentuan SOP Pemilihan ini.</span>
              </label>

              <button
                type="button"
                id="btn-agree-sop-desktop"
                onClick={handleProceed}
                disabled={!agreed}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Vote className="h-4 w-4" aria-hidden="true" />
                {sopAgreed ? 'Lanjut ke Voting' : 'Setuju & Lanjut Vote'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : voter?.hasVoted ? (
            <div className="hidden rounded-2xl border border-gold/25 bg-card-dark p-5 lg:block">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                <p className="text-sm font-bold">Hak Suara Terpakai</p>
              </div>
              <p className="mt-2 text-xs text-gold/70">
                Anda sudah menyelesaikan proses pemungutan suara.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gold/30 text-xs font-bold text-gold hover:bg-gold/10"
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : (
            <div className="hidden rounded-2xl border border-gold/25 bg-card-dark p-5 lg:block">
              <p className="text-sm font-bold text-gold">Ingin Memberikan Suara?</p>
              <p className="mt-1 text-xs text-gold/70">
                Masuk dengan identitas mahasiswa Anda untuk memilih.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" /> Masuk ke Akun
              </button>
            </div>
          )}
        </aside>

        {/* Daftar aturan */}
        <div className="space-y-6">
          <section
            role="tabpanel"
            id="sop-panel"
            aria-labelledby={`sop-tab-${active.id}`}
            className="rounded-2xl border border-gold/25 bg-card-dark p-6 sm:p-8 shadow-xl shadow-black/20"
          >
            <h2 className="text-2xl font-bold text-gold">{active.label}</h2>
            <p className="mt-1 text-sm text-gold/70">{active.description}</p>

            <ol key={active.id} className="mt-6 space-y-4">
              {active.rules.map((rule, index) => (
                <li
                  key={`${index}-${rule}`}
                  className="flex animate-rise gap-4 rounded-xl border border-gold/12 bg-bean/60 p-4"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-medium text-white/90 sm:text-base">{rule}</p>
                </li>
              ))}
            </ol>
          </section>

          <div
            role="note"
            className="flex gap-4 rounded-2xl border-l-4 border-brand bg-gold p-5 text-card-dark shadow-xl shadow-black/30"
          >
            <Info className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="font-extrabold">Perhatian Penting</p>
              <p className="mt-1 text-sm font-medium leading-relaxed">
                Suara yang sudah dikirim bersifat anonim dan tidak dapat diubah atau ditarik kembali.
                Pastikan pilihan Anda sudah benar sebelum memasukkan kode OTP. Jangan pernah
                membagikan kode OTP Anda kepada siapa pun.
              </p>
            </div>
          </div>

          {/* Konfirmasi dan tombol pemilih untuk mobile / bagian bawah artikel */}
          {isVoterActive ? (
            <div className="rounded-2xl border-2 border-gold/30 bg-card-dark p-6 shadow-xl shadow-black/30">
              <div className="flex items-center gap-2 text-gold">
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="text-base font-bold sm:text-lg">Konfirmasi Membaca SOP</h3>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gold/80 leading-relaxed">
                Dengan mencentang pernyataan di bawah ini, Anda menyatakan telah membaca seluruh poin
                SOP Pemilihan dan siap menggunakan hak suara Anda secara bijak, jujur, dan rahasia.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gold/25 bg-bean/70 p-4 transition-colors hover:border-gold/50">
                <input
                  type="checkbox"
                  id="check-sop-agree-mobile"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-gold/40 bg-bean accent-brand cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-bold text-white">
                  Saya telah membaca, memahami, dan menyetujui seluruh ketentuan SOP Pemilihan di atas.
                </span>
              </label>

              <button
                type="button"
                id="btn-agree-sop-mobile"
                onClick={handleProceed}
                disabled={!agreed}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Vote className="h-5 w-5" aria-hidden="true" />
                {sopAgreed ? 'Lanjut ke Bilik Suara (Voting)' : 'Setuju & Lanjut Memilih (Tahap 2)'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : voter?.hasVoted ? (
            <div className="rounded-2xl border border-gold/25 bg-card-dark p-5 text-center lg:hidden">
              <p className="text-sm font-bold text-emerald-400">Hak Suara Sudah Digunakan</p>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-gold/30 px-5 text-xs font-bold text-gold"
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover lg:hidden"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" /> Masuk ke Akun Pemilih
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
