import { useState } from 'react'
import {
  CalendarClock,
  CalendarCog,
  Headphones,
  Layers,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { BrandLogo } from '../../components/SharedUI'
import CandidatesPanel from './CandidatesPanel'
import CategoriesPanel from './CategoriesPanel'
import ContactsPanel from './ContactsPanel'
import ElectionSettingsPanel from './ElectionSettingsPanel'
import SopPanel from './SopPanel'
import TimelinePanel from './TimelinePanel'

const TABS = [
  { id: 'periode', label: 'Periode & Reset', icon: CalendarCog, Panel: ElectionSettingsPanel },
  { id: 'kategori', label: 'Kategori Pemilih', icon: Layers, Panel: CategoriesPanel },
  { id: 'kontak', label: 'Narahubung (CP)', icon: Headphones, Panel: ContactsPanel },
  { id: 'timeline', label: 'Timeline', icon: CalendarClock, Panel: TimelinePanel },
  { id: 'sop', label: 'SOP', icon: ScrollText, Panel: SopPanel },
  { id: 'kandidat', label: 'Kandidat', icon: Users, Panel: CandidatesPanel },
]

export default function SuperAdminPage({ user, onLogout, showToast }) {
  const [tabId, setTabId] = useState(TABS[0].id)
  const active = TABS.find((tab) => tab.id === tabId) || TABS[0]
  const ActivePanel = active.Panel

  return (
    <div className="min-h-screen bg-bean">
      <header className="sticky top-0 z-40 border-b border-gold/12 bg-bean/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
          <BrandLogo subtitle="Panel Super Admin" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight md:block">
              <p className="text-xs text-gold/60">Masuk sebagai</p>
              <p className="text-sm font-semibold text-gold">{user.email}</p>
            </div>
            <a
              href="#/panitia"
              id="link-panitia-dashboard"
              className="flex h-11 items-center gap-2 rounded-xl border border-gold/25 px-4 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Dashboard Panitia</span>
            </a>
            <button
              type="button"
              id="btn-super-logout"
              onClick={onLogout}
              className="flex h-11 items-center gap-2 rounded-xl border border-gold/25 px-4 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-card-dark"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl animate-rise space-y-6 px-4 py-8 lg:px-8 lg:py-10">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-accent">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Super Admin
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-gold sm:text-4xl">Pengelolaan Sistem Pemilihan</h1>
          <p className="mt-1 max-w-2xl text-sm text-gold/70">
            Atur tahun, timeline, SOP, dan kandidat langsung dari sini — tanpa mengubah kode program.
            Perubahan tampil real-time di sisi pemilih.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Menu Super Admin"
          className="flex gap-2 overflow-x-auto rounded-2xl border border-gold/25 bg-card-dark p-2"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = id === active.id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`super-tab-${id}`}
                aria-selected={isActive}
                aria-controls="super-panel"
                onClick={() => setTabId(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-brand text-white shadow-lg shadow-brand/30'
                    : 'text-gold/80 hover:bg-gold/10 hover:text-gold'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            )
          })}
        </div>

        <section id="super-panel" role="tabpanel" aria-labelledby={`super-tab-${active.id}`}>
          <ActivePanel key={active.id} showToast={showToast} />
        </section>
      </main>
    </div>
  )
}
