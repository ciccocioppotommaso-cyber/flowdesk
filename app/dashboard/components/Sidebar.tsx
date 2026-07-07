'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navigation = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: '▦',
  },
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
      { label: 'Lista d\'attesa', href: '/dashboard/clienti/lista-attesa', icon: '⏳' },
      { label: 'Chatbot Demo', href: '/dashboard/clienti/chatbot', icon: '🤖' },
    ],
  },
  {
    section: 'Gestione',
    items: [
      { label: 'Tavoli', href: '/dashboard/tavoli', icon: '🪑' },
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
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()
  const [daVerificare, setDaVerificare] = useState(0)
  const [inAttesa, setInAttesa] = useState(0)

  useEffect(() => {
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
      } catch { /* ignora errori di rete */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    window.addEventListener('refresh-richieste-count', fetchCount)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-richieste-count', fetchCount)
    }
  }, [])

  return (
    <aside
      className={`${open ? 'w-60' : 'w-16'} transition-all duration-200 bg-white border-r border-gray-200 flex flex-col h-full`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-200">
        {open ? (
          <span className="text-lg font-bold text-indigo-600">FlowDesk</span>
        ) : (
          <span className="text-lg font-bold text-indigo-600">F</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navigation.map((item, i) => {
          if ('href' in item) {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                {open && <span>{item.label}</span>}
              </Link>
            )
          }

          return (
            <div key={i} className="pt-4">
              {open && (
                <p className="px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {item.section}
                </p>
              )}
              <div className="space-y-1">
                {item.items.map((sub) => {
                  const active = pathname === sub.href
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-base shrink-0 relative">
                        {sub.icon}
                        {sub.href === '/dashboard/clienti/preventivi' && daVerificare > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                            {daVerificare > 9 ? '9+' : daVerificare}
                          </span>
                        )}
                        {sub.href === '/dashboard/clienti/lista-attesa' && inAttesa > 0 && (
                          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                            {inAttesa > 9 ? '9+' : inAttesa}
                          </span>
                        )}
                      </span>
                      {open && <span className="flex-1">{sub.label}</span>}
                      {open && sub.href === '/dashboard/clienti/preventivi' && daVerificare > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {daVerificare > 9 ? '9+' : daVerificare}
                        </span>
                      )}
                      {open && sub.href === '/dashboard/clienti/lista-attesa' && inAttesa > 0 && (
                        <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {inAttesa > 9 ? '9+' : inAttesa}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Piano attivo */}
      {open && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-indigo-700">Trial gratuito</p>
            <p className="text-xs text-indigo-500 mt-0.5">30 giorni rimanenti</p>
            <button className="mt-2 w-full text-xs bg-indigo-600 text-white rounded-md py-1.5 font-medium hover:bg-indigo-700 transition-colors">
              Passa a Pro
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
