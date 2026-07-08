import Link from 'next/link'
import Logo from './Logo'

interface ComingSoonProps {
  icon: string
  title: string
  tag: string
  description: string
}

export default function ComingSoon({ icon, title, tag, description }: ComingSoonProps) {
  return (
    <main className="min-h-screen bg-ink-navy flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <Logo size={34} dark />
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-white/70 border border-white/20 px-4 py-2 rounded-lg hover:border-white/40 hover:text-white transition-colors"
        >
          ← Torna alla home
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl mx-auto mb-6">
            {icon}
          </div>
          <span className="font-mono text-xs tracking-widest text-zest-lime uppercase">{tag}</span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
          <p className="mt-4 text-white/60 leading-relaxed">
            {description}
          </p>
          <div className="mt-8 inline-flex items-center gap-2 bg-zest-lime text-ink-navy font-semibold text-sm px-5 py-2.5 rounded-lg">
            🚧 In arrivo
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto w-full px-6 py-8 text-center">
        <span className="font-mono text-xs text-white/30">FLOWEST © 2026</span>
      </footer>
    </main>
  )
}
