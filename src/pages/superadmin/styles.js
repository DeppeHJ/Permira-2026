/** Kelas Tailwind bersama untuk panel Super Admin (selaras dengan design system gelap-emas). */

export const inputClass =
  'w-full rounded-xl border border-gold/25 bg-bean/60 px-4 text-white placeholder:text-gold/30 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 disabled:opacity-60'

export const inputSingle = `h-11 ${inputClass}`
export const textareaClass = `${inputClass} py-3 text-sm leading-relaxed`

export const btnPrimary =
  'flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50'

export const btnGhost =
  'flex h-11 items-center justify-center gap-2 rounded-xl border border-gold/30 px-4 text-sm font-bold text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50'

export const btnDanger =
  'flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50'

export const iconBtn =
  'grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold/25 text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-30'
