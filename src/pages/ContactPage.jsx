import { useState } from 'react'
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Headphones,
  HelpCircle,
  MessageCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { BrandLogo } from '../components/SharedUI'
import { useElection } from '../context/electionContext'
import { DEFAULT_CONTACTS } from '../data'

export default function ContactPage({ onBack, onNavigate }) {
  const { appName, contacts } = useElection()
  const list = Array.isArray(contacts) && contacts.length > 0 ? contacts : DEFAULT_CONTACTS

  const [copiedId, setCopiedId] = useState(null)

  const handleCopy = (id, phone) => {
    const cleanNumber = String(phone || '').replace(/[^0-9+]/g, '')
    navigator.clipboard.writeText(cleanNumber)
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev))
    }, 2000)
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (onNavigate) {
      onNavigate('dashboard')
    } else {
      window.location.hash = '#/dashboard'
    }
  }

  return (
    <div className="mx-auto max-w-6xl animate-rise space-y-8 px-4 py-8 lg:px-8 lg:py-10">
      {/* Top Navigation & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 rounded-xl border border-gold/30 bg-card-dark/80 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/15"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
        </div>
      </div>

      {/* Hero Header */}
      <section
        aria-labelledby="contact-heading"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-accent p-6 shadow-2xl shadow-black/40 sm:p-10"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-card-dark/80 px-3 py-1 text-xs font-bold text-gold">
            <Headphones className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Pusat Bantuan Resmi Pemilih
          </span>
          <h1 id="contact-heading" className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
            Narahubung &amp; Layanan Bantuan
          </h1>
          <p className="mt-2 text-base font-medium text-white/90">
            Mengalami kendala saat login, pengiriman kode OTP, verifikasi DPT, atau pertanyaan seputar
            jalannya pemilihan di {appName}? Silakan hubungi 5 narahubung resmi panitia berikut:
          </p>
        </div>
      </section>

      {/* Grid 5 Contact Persons */}
      <section aria-labelledby="contacts-list" className="space-y-4">
        <h2 id="contacts-list" className="text-xl font-bold text-gold">
          Daftar Narahubung Panitia (5 Kontak Siaga)
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((contact, index) => {
            const isCopied = copiedId === contact.id
            const waNumber = String(contact.whatsapp || '').replace(/[^0-9]/g, '')
            const defaultMsg = encodeURIComponent(
              `Halo Panitia ${appName}, saya ingin bertanya terkait pemilihan (${contact.role}).`,
            )
            const waUrl = `https://wa.me/${waNumber}?text=${defaultMsg}`

            return (
              <article
                key={contact.id || index}
                className="group flex flex-col justify-between rounded-2xl border border-gold/25 bg-card-dark p-5 shadow-xl shadow-black/30 transition-all hover:-translate-y-1 hover:border-gold/50"
              >
                <div>
                  {/* Top Badge: Role & Order */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block rounded-md border border-gold/30 bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
                      {contact.role || 'Narahubung'}
                    </span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-bean/60 text-xs font-bold text-gold/70">
                      {index + 1}
                    </span>
                  </div>

                  {/* Name & Availability */}
                  <h3 className="mt-3 text-lg font-extrabold text-white transition-colors group-hover:text-gold">
                    {contact.name}
                  </h3>

                  {contact.available && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gold/70">
                      <Clock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                      <span>{contact.available}</span>
                    </p>
                  )}

                  {/* Description */}
                  {contact.description && (
                    <p className="mt-2.5 text-xs leading-relaxed text-gold/80">
                      {contact.description}
                    </p>
                  )}
                </div>

                {/* Contact Actions */}
                <div className="mt-5 space-y-2.5 border-t border-gold/15 pt-4">
                  {/* Phone & Copy Button */}
                  <div className="flex items-center justify-between rounded-xl bg-bean/60 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 font-mono font-bold text-gold">
                      <Phone className="h-3.5 w-3.5 text-gold/60" aria-hidden="true" />
                      <span>{contact.phone || 'Nomor Kontak'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(contact.id, contact.phone)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-gold/80 transition-colors hover:text-white"
                      title="Salin nomor"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
                          <span className="text-green-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* WhatsApp Action Button */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 text-xs font-bold text-white shadow-lg shadow-green-950/40 transition-all hover:from-emerald-500 hover:to-green-500"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    <span>Hubungi via WhatsApp</span>
                    <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Pertanyaan yang Sering Diajukan (FAQ) */}
      <section
        aria-labelledby="faq-heading"
        className="rounded-2xl border border-gold/25 bg-card-dark p-6 shadow-xl shadow-black/30"
      >
        <h2 id="faq-heading" className="flex items-center gap-2 text-lg font-bold text-gold">
          <HelpCircle className="h-5 w-5 text-accent" aria-hidden="true" />
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gold/15 bg-bean/50 p-4">
            <h3 className="font-bold text-sm text-gold">OTP tidak masuk ke email UI?</h3>
            <p className="mt-1 text-xs leading-relaxed text-gold/80">
              Periksa folder <strong>Spam / Promosi</strong> di akun email kampus Anda. Kode OTP berlaku
              selama 90 detik. Jika belum masuk, tunggu hitung mundur selesai lalu klik{' '}
              <em>Kirim Ulang OTP</em> atau hubungi Narahubung Teknis di atas.
            </p>
          </div>

          <div className="rounded-xl border border-gold/15 bg-bean/50 p-4">
            <h3 className="font-bold text-sm text-gold">NPM tidak terdaftar di DPT?</h3>
            <p className="mt-1 text-xs leading-relaxed text-gold/80">
              Pastikan format penulisan NPM Anda benar (hanya angka). Jika masih dinyatakan tidak
              terdaftar, silakan hubungi <strong>Divisi DPT Panitia</strong> untuk pengecekan status
              mahasiswa aktif.
            </p>
          </div>

          <div className="rounded-xl border border-gold/15 bg-bean/50 p-4">
            <h3 className="font-bold text-sm text-gold">Apakah pilihan saya rahasia?</h3>
            <p className="mt-1 text-xs leading-relaxed text-gold/80">
              <strong>100% Rahasia.</strong> Sistem menggunakan arsitektur pemisahan basis data: identitas
              Anda (DPT) disimpan terpisah dari kotak suara anonim. Panitia maupun pengawas tidak dapat
              melihat siapa memilih siapa.
            </p>
          </div>

          <div className="rounded-xl border border-gold/15 bg-bean/50 p-4">
            <h3 className="font-bold text-sm text-gold">Sesi memilih terputus atau error?</h3>
            <p className="mt-1 text-xs leading-relaxed text-gold/80">
              Hak suara Anda baru dianggap terpakai ketika Anda sudah berhasil memasukkan kode OTP pada
              halaman Review. Jika koneksi terputus sebelumnya, Anda dapat langsung masuk kembali.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Assurance */}
      <footer className="text-center text-xs text-gold/60">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
          Panitia Pemilihan • {appName}
        </p>
      </footer>
    </div>
  )
}
