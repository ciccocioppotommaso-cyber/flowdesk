'use client'

import { useState, useEffect } from 'react'

type Periodo = 'settimana' | 'mese' | 'anno'

interface Piatto {
  id: string
  nome: string
  quantita: number
  incasso: number
}

interface Dati {
  top10: Piatto[]
  bottom10: Piatto[]
  totale: number
}

function fmtEur(n: number) {
  return '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function AnalyticsMenuPage() {
  const [periodo, setPeriodo] = useState<Periodo>('settimana')
  const [dati, setDati] = useState<Dati | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/menu?periodo=${periodo}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setDati)
      .finally(() => setLoading(false))
  }, [periodo])

  const maxTop = Math.max(...(dati?.top10.map(p => p.quantita) ?? [1]), 1)
  const maxBottom = Math.max(...(dati?.bottom10.map(p => p.quantita) ?? [1]), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-navy">Analytics Menu</h1>
        <p className="text-ink-navy/50 text-sm mt-0.5">Piatti più e meno richiesti nel periodo</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-xl border border-ink-navy/10 bg-white overflow-hidden shadow-sm text-sm font-medium w-fit">
          {(['settimana', 'mese', 'anno'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-4 py-2 capitalize transition-colors ${periodo === p ? 'bg-electric-blue text-white' : 'text-ink-navy/50 hover:bg-mist'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        {dati && (
          <p className="text-xs text-ink-navy/40">{dati.totale} piatti ordinati nel periodo</p>
        )}
      </div>

      {loading && !dati && (
        <div className="flex items-center justify-center h-64 text-ink-navy/35">Caricamento...</div>
      )}

      {dati && dati.top10.length === 0 && (
        <div className="bg-white rounded-2xl border border-ink-navy/10 p-12 text-center shadow-sm">
          <p className="text-ink-navy/35 text-sm">Nessun ordine nel periodo selezionato</p>
        </div>
      )}

      {dati && dati.top10.length > 0 && (
        <>
          {/* Top 10 */}
          <div className="bg-white rounded-2xl border border-ink-navy/10 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink-navy mb-5">Piatti più richiesti</h2>
            <div className="space-y-3">
              {dati.top10.map((p, i) => {
                const pct = Math.round((p.quantita / maxTop) * 100)
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-ink-navy/30 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink-navy truncate">{p.nome}</span>
                        <span className="text-xs text-ink-navy/50 ml-2 shrink-0">{p.quantita} pz · {fmtEur(p.incasso)}</span>
                      </div>
                      <div className="h-2 bg-mist rounded-full overflow-hidden">
                        <div className="h-full bg-electric-blue rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom 10 */}
          {dati.bottom10.length > 0 && dati.totale > 1 && (
            <div className="bg-white rounded-2xl border border-ink-navy/10 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-ink-navy mb-5">Piatti meno richiesti</h2>
              <div className="space-y-3">
                {dati.bottom10.map((p, i) => {
                  const pct = Math.max(Math.round((p.quantita / maxBottom) * 100), 4)
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-ink-navy/30 w-5 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-ink-navy truncate">{p.nome}</span>
                          <span className="text-xs text-ink-navy/50 ml-2 shrink-0">{p.quantita} pz · {fmtEur(p.incasso)}</span>
                        </div>
                        <div className="h-2 bg-mist rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tabella completa top */}
          <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-ink-navy/8">
              <h2 className="text-base font-semibold text-ink-navy">Classifica completa</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-mist text-ink-navy/50 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">#</th>
                  <th className="text-left px-4 py-3">Piatto</th>
                  <th className="text-right px-4 py-3">Pezzi</th>
                  <th className="text-right px-6 py-3">Incasso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dati.top10.map((p, i) => (
                  <tr key={p.id} className="hover:bg-mist">
                    <td className="px-6 py-3 text-ink-navy/40 font-semibold">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-ink-navy">{p.nome}</td>
                    <td className="text-right px-4 py-3 text-ink-navy/70">{p.quantita}</td>
                    <td className="text-right px-6 py-3 text-emerald-600 font-medium">{fmtEur(p.incasso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
