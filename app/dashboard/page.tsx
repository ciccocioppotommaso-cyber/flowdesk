import Link from 'next/link'

const stats = [
  { label: 'Lead questo mese', value: '—', icon: '👤', href: '/dashboard/clienti/crm' },
  { label: 'Post pubblicati', value: '—', icon: '📝', href: '/dashboard/marketing/piano' },
  { label: 'ROI campagne', value: '—', icon: '📈', href: '/dashboard/marketing/roi' },
  { label: 'Messaggi non letti', value: '—', icon: '💬', href: '/dashboard/clienti/inbox' },
]

const modules = [
  {
    title: 'Marketing Intelligence',
    description: 'Analytics social, content repurposing AI, piano editoriale e calcolo ROI.',
    icon: '📊',
    links: [
      { label: 'Analytics Social', href: '/dashboard/marketing/analytics' },
      { label: 'Content Repurposing', href: '/dashboard/marketing/content' },
      { label: 'Piano Editoriale', href: '/dashboard/marketing/piano' },
    ],
  },
  {
    title: 'Lead & Client Hub',
    description: 'CRM, inbox unificata WhatsApp + email, preventivi e calendario.',
    icon: '🤝',
    links: [
      { label: 'CRM / Pipeline', href: '/dashboard/clienti/crm' },
      { label: 'Inbox Unificata', href: '/dashboard/clienti/inbox' },
      { label: 'Preventivi', href: '/dashboard/clienti/preventivi' },
    ],
  },
]

export default function DashboardHome() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink-navy">Benvenuto in Flowest</h1>
        <p className="text-ink-navy/50 mt-1">Ecco un riepilogo della tua attività.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-ink-navy/10 rounded-xl p-4 hover:shadow-sm hover:border-electric-blue/30 transition-all"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-extrabold text-ink-navy">{s.value}</div>
            <div className="text-sm text-ink-navy/50 mt-0.5">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Moduli */}
      <div className="grid md:grid-cols-2 gap-6">
        {modules.map((m) => (
          <div key={m.title} className="border border-ink-navy/10 bg-white rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center text-xl">
                {m.icon}
              </div>
              <h2 className="font-bold text-ink-navy">{m.title}</h2>
            </div>
            <p className="text-sm text-ink-navy/50 mb-4">{m.description}</p>
            <div className="flex flex-col gap-1">
              {m.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-electric-blue hover:text-ink-navy font-medium flex items-center gap-1"
                >
                  → {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Banner setup */}
      <div className="bg-ink-navy rounded-xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="font-semibold">Completa il setup del tuo account</p>
          <p className="text-white/50 text-sm mt-0.5">Collega i tuoi social e configura le preferenze AI.</p>
        </div>
        <Link
          href="/dashboard/impostazioni"
          className="bg-zest-lime text-ink-navy text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zest-lime/90 transition-colors shrink-0"
        >
          Configura →
        </Link>
      </div>
    </div>
  )
}
