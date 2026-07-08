'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '../components/Logo'

export default function RegistratiPage() {
  const router = useRouter()

  function scegli(verticale: 'food' | 'care') {
    document.cookie = `verticale_pending=${verticale}; path=/; max-age=600`
    router.push('/sign-up')
  }

  return (
    <main className="min-h-screen bg-mist flex flex-col items-center justify-center p-6">
      <Logo size={34} className="mb-10" />

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-ink-navy tracking-tight">Scegli il tuo prodotto</h1>
        <p className="text-ink-navy/50 mt-2">Puoi cambiarlo in seguito dalle impostazioni</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Food */}
        <button onClick={() => scegli('food')}
          className="bg-white border-2 border-transparent hover:border-electric-blue rounded-2xl p-8 text-left transition-all hover:shadow-lg group">
          <div className="text-4xl mb-4">🍽️</div>
          <h2 className="text-xl font-extrabold text-ink-navy group-hover:text-electric-blue transition-colors">
            Flowest Food
          </h2>
          <p className="text-ink-navy/50 text-sm mt-2 leading-relaxed">
            Gestione tavoli, menu digitale, ordini QR, prenotazioni, staff e analytics per ristoranti e locali.
          </p>
          <span className="inline-block mt-4 font-mono text-[11px] tracking-wide font-semibold bg-electric-blue/10 text-electric-blue px-3 py-1 rounded-full">
            Ristoranti · Bar · Locali
          </span>
        </button>

        {/* Care */}
        <button onClick={() => scegli('care')}
          className="bg-white border-2 border-transparent hover:border-electric-blue rounded-2xl p-8 text-left transition-all hover:shadow-lg group">
          <div className="text-4xl mb-4">🩺</div>
          <h2 className="text-xl font-extrabold text-ink-navy group-hover:text-electric-blue transition-colors">
            Flowest Care
          </h2>
          <p className="text-ink-navy/50 text-sm mt-2 leading-relaxed">
            Gestione pazienti, appuntamenti, cartelle cliniche, staff e analytics per strutture sanitarie.
          </p>
          <span className="inline-block mt-4 font-mono text-[11px] tracking-wide font-semibold bg-electric-blue/10 text-electric-blue px-3 py-1 rounded-full">
            Cliniche · Studi · Ambulatori
          </span>
        </button>
      </div>

      <p className="mt-8 text-sm text-ink-navy/40">
        Hai già un account?{' '}
        <Link href="/sign-in" className="text-electric-blue hover:underline font-medium">Accedi</Link>
      </p>
    </main>
  )
}
