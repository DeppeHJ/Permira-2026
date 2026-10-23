import { CheckCheck, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react'
import { BrandLogo } from '../components/SharedUI'

const CONFETTI_COLORS = ['#E8C580', '#E48523', '#FFFFFF', '#BA3D03']

// Deterministik (tanpa Math.random) agar render tetap murni & konsisten.
const CONFETTI = Array.from({ length: 64 }, (_, i) => ({
  id: i,
  left: (i * 53) % 100,
  delay: ((i * 37) % 40) / 10,
  duration: 4 + ((i * 17) % 40) / 10,
  drift: ((i * 29) % 140) - 70,
  size: 6 + ((i * 7) % 9),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,
}))

export default function SuccessPage({ voter, onNavigate, onLogout }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#E48523_0%,#BA3D03_30%,#3D1203_75%)] px-4 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {CONFETTI.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-0 block animate-confetti"
            style={{
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.round ? piece.size : piece.size * 1.6,
              borderRadius: piece.round ? '9999px' : '2px',
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              '--drift': `${piece.drift}px`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <BrandLogo />

        <div className="mt-10 grid h-28 w-28 animate-pop place-items-center rounded-full border-4 border-gold bg-card-dark shadow-2xl shadow-black/50">
          <CheckCheck className="h-14 w-14 text-gold" strokeWidth={2.5} aria-hidden="true" />
        </div>

        <h1 className="mt-8 animate-rise text-4xl font-extrabold text-gold sm:text-5xl">
          Terima Kasih!
        </h1>
        <p className="mt-4 animate-rise text-lg font-semibold text-white">
          Suara Anda telah berhasil direkam, {voter?.nama ? voter.nama.split(' ')[0] : 'Mahasiswa'}.
        </p>
        <p className="mt-2 max-w-md animate-rise text-sm font-medium text-white/85">
          Terima kasih telah berpartisipasi dalam PERMIRA 2026. Pilihan Anda tersimpan secara rahasia
          dan tidak dapat dikaitkan dengan identitas Anda.
        </p>

        <div className="mt-8 flex w-full animate-rise items-start gap-3 rounded-2xl border border-gold/30 bg-card-dark/80 p-4 text-left backdrop-blur">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <p className="text-sm text-gold/90">
            Hak suara Anda kini ditandai <strong>sudah digunakan</strong>. Anda dapat terus memantau
            partisipasi melalui dashboard.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            id="btn-go-dashboard"
            onClick={() => onNavigate?.('dashboard')}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-card-dark px-8 text-sm font-bold text-gold shadow-lg shadow-black/40 transition-colors hover:bg-black"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Lihat Dashboard
          </button>
          <button
            type="button"
            id="btn-finish"
            onClick={onLogout}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/60 px-8 text-sm font-bold text-white transition-colors hover:bg-white/15"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Selesai &amp; Keluar
          </button>
        </div>
      </div>
    </main>
  )
}
