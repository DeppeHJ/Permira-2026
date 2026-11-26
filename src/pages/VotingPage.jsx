import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { CandidateCard, CandidateModal, KotakKosongCard, Stepper } from '../components/SharedUI'
import { useElection } from '../context/electionContext'

/**
 * Halaman bilik suara generik untuk tahap `ai` dan `kabem`.
 * `selections` berbentuk { aiId, kabemId }.
 */
export default function VotingPage({ type, selections, onSelect, onNext, onBack }) {
  const [detail, setDetail] = useState(null)
  const { votingSteps, getCandidate } = useElection()
  const config = votingSteps[type]
  const isAi = type === 'ai'
  const selectedId = selections[config.selectionKey]
  const selected = getCandidate(selectedId)

  return (
    <div className="mx-auto max-w-7xl animate-rise px-4 pt-6 pb-44 sm:pt-8 sm:pb-36 lg:px-8 lg:pt-10 lg:pb-36">
      <div className="rounded-2xl border border-gold/25 bg-card-dark/70 p-4 sm:p-6">
        <Stepper step={isAi ? 2 : 3} />
      </div>

      <header className="mt-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-gold sm:text-4xl">{config.title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium text-gold/80 sm:text-base">
          {config.subtitle}
        </p>
      </header>

      {config.candidates.length === 0 && !config.blankOption && (
        <p className="mt-8 rounded-2xl border border-gold/25 bg-card-dark p-6 text-center text-sm text-gold/80">
          Belum ada kandidat yang terdaftar untuk tahap ini. Hubungi Panitia.
        </p>
      )}

      <div
        className={`mt-8 grid gap-4 lg:gap-6 ${
          isAi ? 'sm:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-2'
        }`}
      >
        {config.candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedId === candidate.id}
            onShowDetail={setDetail}
            onChoose={(c) => onSelect(config.selectionKey, c.id)}
          />
        ))}
        {config.blankOption && (
          <KotakKosongCard
            option={config.blankOption}
            selected={selectedId === config.blankOption.id}
            onChoose={(c) => onSelect(config.selectionKey, c.id)}
            className={!isAi && config.candidates.length % 2 === 0 ? 'lg:col-span-2' : ''}
          />
        )}
      </div>

      {/* Bar aksi melekat di bawah */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gold/20 bg-bean/95 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="flex min-w-0 items-center gap-2 text-sm text-gold/80" aria-live="polite">
            {selected ? (
              <>
                <Check className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <span className="truncate">
                  Pilihan:{' '}
                  {selected.number && (
                    <>
                      <strong className="text-gold">{selected.number}</strong> ·{' '}
                    </>
                  )}
                  <strong className="text-white">{selected.name}</strong>
                </span>
              </>
            ) : (
              'Belum ada kandidat yang dipilih.'
            )}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-gold/30 px-5 text-sm font-bold text-gold transition-colors hover:bg-gold/10 sm:flex-none"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {isAi ? 'SOP Pemilihan' : 'Pilih AI'}
            </button>
            <button
              type="button"
              id="btn-next-step"
              onClick={onNext}
              disabled={!selected}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              {isAi ? 'Lanjut ke Paslon Kabem' : 'Review & Verifikasi'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <CandidateModal
        candidate={detail}
        selected={detail ? selectedId === detail.id : false}
        onClose={() => setDetail(null)}
        onChoose={(c) => onSelect(config.selectionKey, c.id)}
      />
    </div>
  )
}
