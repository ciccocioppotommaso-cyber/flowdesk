'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SETTORI = [
  'Ristorazione', 'Biomedica', 'Consulenza', 'E-commerce',
  'Immobiliare', 'Fitness & Wellness', 'Avvocati & Studi legali',
  'Artigianato', 'Moda & Beauty', 'Educazione & Formazione',
]

const OBIETTIVI = [
  { id: 'lead', label: 'Trovare nuovi clienti', icon: '👤' },
  { id: 'social', label: 'Crescere sui social', icon: '📱' },
  { id: 'roi', label: 'Misurare il ROI delle campagne', icon: '📈' },
  { id: 'clienti', label: 'Gestire meglio i clienti esistenti', icon: '🤝' },
  { id: 'contenuti', label: 'Produrre più contenuti', icon: '✍️' },
  { id: 'tempo', label: 'Risparmiare tempo', icon: '⏱️' },
]

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    name: '',
    niche: '',
    nicheCustom: '',
    objectives: [] as string[],
  })
  const [loading, setLoading] = useState(false)

  const totalSteps = 3

  function toggleObjective(id: string) {
    setData((d) => ({
      ...d,
      objectives: d.objectives.includes(id)
        ? d.objectives.filter((o) => o !== id)
        : [...d.objectives, id],
    }))
  }

  async function handleFinish() {
    setLoading(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          niche: data.niche === 'Altro' ? data.nicheCustom : data.niche,
          objectives: data.objectives,
        }),
      })
      router.push('/dashboard/check')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-ink-navy/10 w-full max-w-lg p-8">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-ink-navy/35 mb-2">
            <span>Step {step} di {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-ink-navy/10 rounded-full">
            <div
              className="h-1.5 bg-electric-blue rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 — Nome */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-ink-navy">Ciao! Come ti chiami?</h1>
              <p className="text-ink-navy/50 text-sm mt-1">Personalizzeremo Flowest per te.</p>
            </div>
            <input
              type="text"
              placeholder="Il tuo nome o il nome della tua attività"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="w-full border border-ink-navy/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue"
              autoFocus
            />
            <button
              onClick={() => setStep(2)}
              disabled={!data.name.trim()}
              className="w-full bg-electric-blue text-white font-semibold py-3 rounded-xl hover:bg-electric-blue/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continua →
            </button>
          </div>
        )}

        {/* Step 2 — Settore */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-ink-navy">In che settore operi?</h1>
              <p className="text-ink-navy/50 text-sm mt-1">Adatteremo le funzionalità AI al tuo settore.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SETTORI.map((s) => (
                <button
                  key={s}
                  onClick={() => setData({ ...data, niche: s })}
                  className={`text-sm px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    data.niche === s
                      ? 'border-electric-blue bg-electric-blue/10 text-electric-blue font-medium'
                      : 'border-ink-navy/10 hover:border-ink-navy/15 text-ink-navy/70'
                  }`}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() => setData({ ...data, niche: 'Altro' })}
                className={`text-sm px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  data.niche === 'Altro'
                    ? 'border-electric-blue bg-electric-blue/10 text-electric-blue font-medium'
                    : 'border-ink-navy/10 hover:border-ink-navy/15 text-ink-navy/70'
                }`}
              >
                Altro...
              </button>
            </div>
            {data.niche === 'Altro' && (
              <input
                type="text"
                placeholder="Specifica il tuo settore"
                value={data.nicheCustom}
                onChange={(e) => setData({ ...data, nicheCustom: e.target.value })}
                className="w-full border border-ink-navy/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue"
                autoFocus
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-ink-navy/15 text-ink-navy/70 font-semibold py-3 rounded-xl hover:bg-mist transition-colors"
              >
                ← Indietro
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!data.niche || (data.niche === 'Altro' && !data.nicheCustom.trim())}
                className="flex-1 bg-electric-blue text-white font-semibold py-3 rounded-xl hover:bg-electric-blue/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continua →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Obiettivi */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-ink-navy">Quali sono i tuoi obiettivi?</h1>
              <p className="text-ink-navy/50 text-sm mt-1">Puoi selezionarne più di uno.</p>
            </div>
            <div className="space-y-2">
              {OBIETTIVI.map((o) => (
                <button
                  key={o.id}
                  onClick={() => toggleObjective(o.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                    data.objectives.includes(o.id)
                      ? 'border-electric-blue bg-electric-blue/10'
                      : 'border-ink-navy/10 hover:border-ink-navy/15'
                  }`}
                >
                  <span className="text-xl">{o.icon}</span>
                  <span className={`text-sm font-medium ${data.objectives.includes(o.id) ? 'text-electric-blue' : 'text-ink-navy/70'}`}>
                    {o.label}
                  </span>
                  {data.objectives.includes(o.id) && (
                    <span className="ml-auto text-electric-blue text-sm">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-ink-navy/15 text-ink-navy/70 font-semibold py-3 rounded-xl hover:bg-mist transition-colors"
              >
                ← Indietro
              </button>
              <button
                onClick={handleFinish}
                disabled={data.objectives.length === 0 || loading}
                className="flex-1 bg-electric-blue text-white font-semibold py-3 rounded-xl hover:bg-electric-blue/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvo...' : 'Inizia 🚀'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
