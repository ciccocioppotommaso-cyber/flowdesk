'use client'

import { useState, useEffect } from 'react'

type Periodo = 'settimana' | 'mese' | 'anno'

interface Bucket {
  data: string
  incasso: number
  ordini: number
  asporto: number
  delivery: number
}

interface FasciaOraria {
  ora: string
  count: number
}

interface Dati {
  totaleIncasso: number
  totaleOrdini: number
  asportoCount: number
  deliveryCount: number
  spesaMedia: number
  tassoNonConsegnati: number
  andamento: Bucket[]
  fasceOrarie: FasciaOraria[]
}

function fmtEur(n: number) {
  return '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtData(s: string, periodo: Periodo) {
  if (periodo === 'anno') {
    return new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { month: 'short' })
  }
  return new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function AnalyticsOrdiniPage() {
  const [periodo, setPeriodo] = useState<Periodo>('settimana')
  const [dati, setDati] = useState<Dati | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/ordini?periodo=${periodo}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setDati)
      .finally(() => setLoading(false))
  }, [periodo])

  const maxIncasso = Math.max(...(dati?.andamento.map(b => b.incasso) ?? [1]), 1)
  const maxOrdini = Math.max(...(dati?.andamento.map(b => b.ordini) ?? [1]), 1)
  const maxFascia = Math.max(...(dati?.fasceOrarie.map(f => f.count) ?? [1]), 1)

  const periodoLabel = periodo === 'settimana' ? 'questa settimana' : periodo === 'mese' ? 'questo mese' : 'ultimi 12 mesi'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-navy">Analytics Ordini</h1>
        <p className="text-ink-navy/50 text-sm mt-0.5">Statistiche su asporto, delivery e andamento ordini</p>
      </div>

      <div className="flex rounded-xl border border-ink-navy/10 bg-white overflow-hidden shadow-sm text-sm font-medium w-fit">
        {(['settimana', 'mese', 'anno'] as Periodo[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className={`px-4 py-2 capitalize transition-colors ${periodo === p ? 'bg-electric-blue text-white' : 'text-ink-navy/50 hover:bg-mist'}`}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {loading && !dati && (
        <div className="flex items-center justify-center h-64 text-ink-navy/35">Caricamento...</div>
      )}

      {dati && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Incasso totale', val: fmtEur(dati.totaleIncasso), sub: periodoLabel, color: 'text-emerald-600' },
              { label: 'Totale ordini', val: String(dati.totaleOrdini), sub: 'asporto + delivery', color: 'text-ink-navy' },
              { label: 'Asporto', val: String(dati.asportoCount), sub: 'ordini da ritirare', color: 'text-electric-blue' },
              { label: 'Delivery', val: String(dati.deliveryCount), sub: 'ordini a domicilio', color: 'text-electric-blue' },
              { label: 'Spesa media/ordine', val: fmtEur(dati.spesaMedia), sub: 'incasso ÷ ordini', color: 'text-electric-blue' },
              { label: 'Non consegnati', val: dati.tassoNonConsegnati.toFixed(1) + '%', sub: 'annullati o non ritirati', color: dati.tassoNonConsegnati > 10 ? 'text-red-500' : dati.tassoNonConsegnati > 5 ? 'text-amber-500' : 'text-green-500' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-ink-navy/10 p-5 shadow-sm">
                <p className="text-xs text-ink-navy/50 uppercase tracking-wide">{k.label}</p>
                <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.val}</p>
                <p className="text-xs text-ink-navy/35 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Grafico incasso */}
          <div className="bg-white rounded-2xl border border-ink-navy/10 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink-navy mb-4">Andamento incasso</h2>
            {dati.andamento.length === 0 ? (
              <p className="text-ink-navy/35 text-sm py-8 text-center">Nessun dato nel periodo selezionato</p>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                {dati.andamento.map(b => {
                  const h = Math.round((b.incasso / maxIncasso) * 120)
                  return (
                    <div key={b.data} className="flex-1 flex flex-col items-center gap-1">
                      {b.incasso > 0 && (
                        <span className="text-[10px] text-ink-navy/50 font-medium leading-none">{fmtEur(b.incasso)}</span>
                      )}
                      <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                        <div className="w-full bg-emerald-500 rounded-t-lg" style={{ height: `${Math.max(h, b.incasso > 0 ? 4 : 0)}px` }} />
                      </div>
                      <span className="text-[10px] text-ink-navy/35 leading-none">{fmtData(b.data, periodo)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Asporto vs Delivery + Fasce orarie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-ink-navy/10 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-ink-navy mb-4">Asporto vs Delivery</h2>
              {dati.andamento.length === 0 ? (
                <p className="text-ink-navy/35 text-sm py-8 text-center">Nessun dato</p>
              ) : (
                <>
                  <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                    {dati.andamento.map(b => {
                      const hA = Math.round((b.asporto / maxOrdini) * 100)
                      const hD = Math.round((b.delivery / maxOrdini) * 100)
                      return (
                        <div key={b.data} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '100px' }}>
                            <div className="w-full bg-purple-400 rounded-t-sm" style={{ height: `${Math.max(hD, b.delivery > 0 ? 3 : 0)}px` }} />
                            <div className="w-full bg-electric-blue" style={{ height: `${Math.max(hA, b.asporto > 0 ? 3 : 0)}px` }} />
                          </div>
                          <span className="text-[10px] text-ink-navy/35 leading-none">{fmtData(b.data, periodo)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-ink-navy/50">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-electric-blue inline-block" /> Asporto</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" /> Delivery</span>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-ink-navy/10 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-ink-navy mb-4">Fasce orarie più richieste</h2>
              {dati.fasceOrarie.length === 0 ? (
                <p className="text-ink-navy/35 text-sm py-8 text-center">Nessun dato</p>
              ) : (
                <div className="flex items-end gap-1" style={{ height: 120 }}>
                  {dati.fasceOrarie.map(f => {
                    const h = Math.round((f.count / maxFascia) * 100)
                    return (
                      <div key={f.ora} className="flex-1 flex flex-col items-center gap-1">
                        {f.count > 0 && (
                          <span className="text-[10px] text-ink-navy/50 leading-none">{f.count}</span>
                        )}
                        <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                          <div className="w-full bg-amber-400 rounded-t-sm" style={{ height: `${Math.max(h, f.count > 0 ? 3 : 0)}px` }} />
                        </div>
                        <span className="text-[10px] text-ink-navy/35 leading-none">{f.ora.slice(0, 5)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tabella dettaglio */}
          <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-ink-navy/8">
              <h2 className="text-base font-semibold text-ink-navy">Dettaglio giornaliero</h2>
            </div>
            {dati.andamento.length === 0 ? (
              <p className="text-ink-navy/35 text-sm px-6 py-8 text-center">Nessun dato</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-mist text-ink-navy/50 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3">Data</th>
                    <th className="text-right px-4 py-3">Asporto</th>
                    <th className="text-right px-4 py-3">Delivery</th>
                    <th className="text-right px-4 py-3">Totale</th>
                    <th className="text-right px-6 py-3">Incasso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...dati.andamento].reverse().map(b => (
                    <tr key={b.data} className="hover:bg-mist">
                      <td className="px-6 py-3 font-medium text-ink-navy">
                        {new Date(b.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                      </td>
                      <td className="text-right px-4 py-3 text-ink-navy/70">{b.asporto || '—'}</td>
                      <td className="text-right px-4 py-3 text-ink-navy/70">{b.delivery || '—'}</td>
                      <td className="text-right px-4 py-3 text-ink-navy/70">{b.ordini || '—'}</td>
                      <td className="text-right px-6 py-3 text-emerald-600 font-medium">
                        {b.incasso > 0 ? fmtEur(b.incasso) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
