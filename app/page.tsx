'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import Logo from './components/Logo'

const VERTICALI = [
  {
    id: 'food',
    icon: '🍽️',
    title: 'Flowest Food',
    tag: 'Ristoranti · Bar · Locali',
    description: 'Tavoli, menu digitale, ordini QR, prenotazioni, staff e analytics per la ristorazione.',
    cta: 'Inizia gratis',
    available: true,
  },
  {
    id: 'care',
    icon: '🩺',
    title: 'Flowest Care',
    tag: 'Studi · Cliniche · Ambulatori',
    description: 'Pazienti, appuntamenti, cartelle cliniche e agenda per professionisti sanitari.',
    cta: 'Scopri di più',
    available: false,
    href: '/care',
  },
  {
    id: 'web',
    icon: '🌐',
    title: 'Flowest Web',
    tag: 'Siti · Landing page · E-commerce',
    description: 'Siti web professionali, veloci e sempre aggiornati, gestiti senza pensieri.',
    cta: 'Scopri di più',
    available: false,
    href: '/web',
  },
]

export default function Home() {
  const { isSignedIn } = useAuth()

  function scegliFood() {
    document.cookie = `verticale_pending=food; path=/; max-age=600`
    window.location.href = '/sign-up'
  }

  return (
    <main className="min-h-screen bg-mist">
      {/* Nav */}
      <header className="border-b border-ink-navy/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={34} />
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-white bg-ink-navy px-4 py-2 rounded-lg hover:bg-ink-navy/90 transition-colors"
            >
              Vai alla dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-ink-navy border border-ink-navy/20 px-4 py-2 rounded-lg hover:border-ink-navy/40 transition-colors"
            >
              Accedi
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="font-mono text-xs tracking-widest text-electric-blue uppercase">
          Software gestionale · Made in Italy
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-ink-navy tracking-tight leading-tight">
          Gestisci il tuo business.<br />
          <span className="text-electric-blue">Zero friction.</span>
        </h1>
        <p className="mt-5 text-lg text-ink-navy/60 max-w-2xl mx-auto leading-relaxed">
          Flowest è la piattaforma che semplifica la gestione quotidiana di ristoranti,
          studi sanitari e siti web: prenotazioni, clienti, staff e comunicazione in un unico posto,
          senza complicazioni.
        </p>
      </section>

      {/* Verticali */}
      <section className="bg-ink-navy">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Scegli il tuo prodotto</h2>
            <p className="text-white/50 mt-2 text-sm">Un prodotto dedicato per ogni tipo di attività.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {VERTICALI.map((v) => {
              const card = (
                <div className="h-full bg-white rounded-2xl p-7 flex flex-col border-2 border-transparent hover:border-electric-blue transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-mist flex items-center justify-center text-2xl mb-5">
                    {v.icon}
                  </div>
                  <h3 className="text-lg font-extrabold text-ink-navy">{v.title}</h3>
                  <span className="font-mono text-[11px] tracking-wide text-electric-blue mt-1">{v.tag}</span>
                  <p className="text-sm text-ink-navy/60 mt-3 leading-relaxed flex-1">{v.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink-navy group-hover:text-electric-blue transition-colors">
                    {v.cta} →
                  </span>
                </div>
              )

              return v.available ? (
                <button key={v.id} onClick={scegliFood} className="text-left">
                  {card}
                </button>
              ) : (
                <Link key={v.id} href={v.href!}>
                  {card}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <span className="font-mono text-xs text-ink-navy/40">FLOWEST © 2026</span>
        <span className="font-mono text-xs text-ink-navy/40">flowest.it</span>
      </footer>
    </main>
  )
}
