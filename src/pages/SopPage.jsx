import { useState } from 'react'
import { ChevronRight, Info, ScrollText, Vote } from 'lucide-react'
import { SOP_TABS } from '../data'

export default function SopPage({ onNavigate }) {
  const [activeId, setActiveId] = useState(SOP_TABS[0].id)
  const active = SOP_TABS.find((tab) => tab.id === activeId) || SOP_TABS[0]

  return (
    <div className="mx-auto max-w-7xl animate-rise px-4 py-8 lg:px-8 lg:py-10">
      <header className="mb-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-accent">
          <ScrollText className="h-4 w-4" aria-hidden="true" /> Standar Operasional Prosedur
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-gold sm:text-4xl">
          SOP Pemilihan PERMIRA 2026
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gold/80">
          Baca ketentuan berikut sebelum menggunakan hak suara Anda.
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

          <div className="hidden rounded-2xl border border-gold/25 bg-card-dark p-5 lg:block">
            <p className="text-sm font-bold text-gold">Sudah paham aturannya?</p>
            <p className="mt-1 text-xs text-gold/70">Lanjutkan ke bilik suara untuk mulai memilih.</p>
            <button
              type="button"
              onClick={() => onNavigate('voteAI')}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover"
            >
              <Vote className="h-4 w-4" aria-hidden="true" /> Mulai Memilih
            </button>
          </div>
        </aside>

        {/* Daftar aturan */}
        <div className="space-y-6">
          <section
            role="tabpanel"
            id="sop-panel"
            aria-labelledby={`sop-tab-${active.id}`}
            className="rounded-2xl border border-gold/25 bg-card-dark p-6 sm:p-8"
          >
            <h2 className="text-2xl font-bold text-gold">{active.label}</h2>
            <p className="mt-1 text-sm text-gold/70">{active.description}</p>

            <ol key={active.id} className="mt-6 space-y-4">
              {active.rules.map((rule, index) => (
                <li
                  key={rule}
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
              <p className="font-extrabold">Perhatian</p>
              <p className="mt-1 text-sm font-medium">
                Suara yang sudah dikirim tidak dapat diubah atau ditarik kembali. Pastikan pilihan
                Anda sudah benar sebelum memasukkan kode OTP. Jangan pernah membagikan kode OTP
                kepada siapa pun.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('voteAI')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover lg:hidden"
          >
            <Vote className="h-5 w-5" aria-hidden="true" /> Mulai Memilih
          </button>
        </div>
      </div>
    </div>
  )
}
