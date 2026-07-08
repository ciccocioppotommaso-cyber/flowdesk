'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navFood = [
  {
    section: 'Modulo 1 — Marketing',
    items: [
      { label: 'Analytics Social', href: '/dashboard/marketing/analytics', icon: '📊' },
      { label: 'Content Repurposing', href: '/dashboard/marketing/content', icon: '✨' },
      { label: 'Piano Editoriale', href: '/dashboard/marketing/piano', icon: '📅' },
      { label: 'Report ROI', href: '/dashboard/marketing/roi', icon: '📈' },
    ],
  },
  {
    section: 'Modulo 2 — Clienti',
    items: [
      { label: 'Contatti & Pipeline', href: '/dashboard/clienti/crm', icon: '🗂️' },
      { label: 'Messaggi', href: '/dashboard/clienti/inbox', icon: '💬' },
      { label: 'Richieste', href: '/dashboard/clienti/preventivi', icon: '📋' },
      { label: 'Calendario', href: '/dashboard/clienti/calendario', icon: '🗓️' },
      { label: "Lista d'attesa", href: '/dashboard/clienti/lista-attesa', icon: '⏳' },
      { label: 'Chatbot Demo', href: '/dashboard/clienti/chatbot', icon: '🤖' },
    ],
  },
  {
    section: 'Gestione',
    items: [
      { label: 'Menu', href: '/dashboard/menu', icon: '🍽️' },
      { label: 'Ordini', href: '/dashboard/ordini', icon: '🧾' },
      { label: 'Tavoli & QR', href: '/dashboard/tavoli', icon: '🪑' },
      { label: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
      { label: 'Staff', href: '/dashboard/staff', icon: '👥' },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'Impostazioni', href: '/dashboard/impostazioni', icon: '⚙️' },
    ],
  },
]

const navCare = [
  {
    section: 'Pazienti',
    items: [
      { label: 'Pazienti', href: '/dashboard/care/pazienti', icon: '🧑‍⚕️' },
      { label: 'Appuntamenti', href: '/dashboard/care/appuntamenti', icon: '🗓️' },
      { label: 'Cartelle cliniche', href: '/dashboard/care/cartelle', icon: '📁' },
    ],
  },
  {
    section: 'Gestione',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
      { label: 'Staff', href: '/dashboard/staff', icon: '👥' },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'Impostazioni', href: '/dashboard/impostazioni', icon: '⚙️' },
    ],
  },
]

interface SidebarProps {
  verticale: 'food' | 'care'
}

export default function Sidebar({ verticale }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  const [daVerificare, setDaVerificare] = useState(0)
  const [inAttesa, setInAttesa] = useState(0)

  useEffect(() => {
    if (verticale !== 'food') return
    async function fetchCount() {
      try {
        const [resP, resA] = await Promise.all([
          fetch('/api/preventivi/count', { credentials: 'include' }),
          fetch('/api/lista-attesa?attivi=true', { credentials: 'include' }),
        ])
        const dataP = await resP.json()
        const dataA = await resA.json()
        setDaVerificare(dataP.daVerificare ?? 0)
        setInAttesa((dataA.lista ?? []).length)
      } catch { }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    window.addEventListener('refresh-richieste-count', fetchCount)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-richieste-count', fetchCount)
    }
  }, [verticale])

  const navigation = verticale === 'food' ? navFood : navCare
  const logoLabel = verticale === 'food' ? 'Flowest Food' : 'Flowest Care'

  return (
    <aside className={`${open ? 'w-60' : 'w-16'} transition-all duration-200 bg-ink-navy flex flex-col h-full`}>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
        {open ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-[28%] bg-electric-blue flex items-center justify-center shrink-0">
              <span className="text-zest-lime font-extrabold text-sm leading-none">F</span>
            </div>
            <span className="text-sm font-extrabold text-white truncate">{logoLabel}</span>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-[28%] bg-electric-blue flex items-center justify-center shrink-0 mx-auto">
            <span className="text-zest-lime font-extrabold text-sm leading-none">F</span>
          </div>
        )}
        <button onClick={() => setOpen(v => !v)} className="text-white/30 hover:text-white/70 text-xs ml-1">
          {open ? '◀' : '▶'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <Link href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'bg-electric-blue text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
          <span className="text-base shrink-0">▦</span>
          {open && <span>Overview</span>}
        </Link>

        {navigation.map((group, i) => (
          <div key={i} className="pt-4">
            {open && (
              <p className="px-3 pb-1 font-mono text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                {group.section}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-electric-blue text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}>
                    <span className="text-base shrink-0 relative">
                      {item.icon}
                      {item.href === '/dashboard/clienti/preventivi' && daVerificare > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                          {daVerificare > 9 ? '9+' : daVerificare}
                        </span>
                      )}
                      {item.href === '/dashboard/clienti/lista-attesa' && inAttesa > 0 && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                          {inAttesa > 9 ? '9+' : inAttesa}
                        </span>
                      )}
                    </span>
                    {open && <span className="flex-1">{item.label}</span>}
                    {open && item.href === '/dashboard/clienti/preventivi' && daVerificare > 0 && (
                      <span className="bg-zest-lime text-ink-navy text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {daVerificare > 9 ? '9+' : daVerificare}
                      </span>
                    )}
                    {open && item.href === '/dashboard/clienti/lista-attesa' && inAttesa > 0 && (
                      <span className="bg-amber-400 text-ink-navy text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {inAttesa > 9 ? '9+' : inAttesa}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Piano attivo */}
      {open && (
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs font-semibold text-zest-lime">
              Trial gratuito
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              30 giorni rimanenti
            </p>
            <button className="mt-2 w-full text-xs bg-zest-lime hover:bg-zest-lime/90 text-ink-navy rounded-md py-1.5 font-semibold transition-colors">
              Passa a Pro
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
