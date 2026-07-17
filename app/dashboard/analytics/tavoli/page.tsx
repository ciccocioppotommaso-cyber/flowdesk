'use client'

import { useState, useEffect } from 'react'

type Periodo = 'settimana' | 'mese' | 'anno'

interface Bucket {
  data: string
  incasso: number
  ordini: number
  coperti: number
}

interface Dati {
  totaleIncasso: number
  totaleOrdini: number
  copertiConfermati: number
  spesaMediaPersona: number
  tassoNoShow: number
  durataMediaMinuti: number
  andamento: Bucket[]
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

export default function AnalyticsTavoliPage() {
  const [periodo, setPeriodo] = useState<Periodo>('settimana')
  const [dati, setDati] = useState<Dati | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/tavoli?periodo=${periodo}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setDati)
      .finally(() => setLoading(false))
  }, [periodo])

  const maxIncasso = Math.max(...(dati?.andamento.map(b => b.incasso) ?? [1]), 1)
  const maxCoperti = Math.max(...(dati?.andamento.map(b => b.coperti) ?? [1]), 1)

  const periodoLabel = periodo === 'settimana' ? 'questa settimana' : periodo === 'mese' ? 'questo mese' : 'ultimi 12 mesi'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-navy">Analytics Tavoli</h1>
        <p className="text-ink-navy/50 text-sm mt-0.5">Statistiche su incassi, coperti e performance dei tavoli</p>
      </div>

      {/* Selettore periodo */}
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
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Incasso totale', val: fmtEur(dati.totaleIncasso), sub: periodoLabel, color: 'text-emerald-600' },
              { label: 'Tavoli serviti', val: String(dati.totaleOrdini), sub: 'conti chiusi', color: 'text-ink-navy' },
              { label: 'Coperti', val: String(dati.copertiConfermati), sub: 'da prenotazioni', color: 'text-ink-navy' },
              { label: 'Spesa media/persona', val: fmtEur(dati.spesaMediaPersona), sub: 'incasso ÷ coperti', color: 'text-electric-blue' },
              { label: 'Tasso no-show', val: dati.tassoNoShow.toFixed(1) + '%', sub: 'prenotazioni non arrivate', color: dati.tassoNoShow > 15 ? 'text-red-500' : dati.tassoNoShow > 8 ? 'text-amber-500' : 'text-green-500' },
              { label: 'Durata media tavolo', val: dati.durataMediaMinuti > 0 ? dati.durataMediaMinuti + ' min' : '—', sub: "dall'ordine alla chiusura", color: 'text-electric-blue' },
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
                        <span className="text-[10px] text-ink-navy/50 font-medium leading-none">
                          {fmtEur(b.incasso)}
                        </span>
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

          {/* Grafico coperti */}
          <div className="bg-white rounded-2xl border border-ink-navy/10 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink-navy mb-4">Andamento coperti</h2>
            {dati.andamento.length === 0 ? (
              <p className="text-ink-navy/35 text-sm py-8 text-center">Nessun dato nel periodo selezionato</p>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                {dati.andamento.map(b => {
                  const h = Math.round((b.coperti / maxCoperti) * 120)
                  return (
                    <div key={b.data} className="flex-1 flex flex-col items-center gap-1">
                      {b.coperti > 0 && (
                        <span className="text-[10px] text-ink-navy/50 font-medium leading-none">{b.coperti}</span>
                      )}
                      <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                        <div className="w-full bg-electric-blue rounded-t-lg" style={{ height: `${Math.max(h, b.coperti > 0 ? 4 : 0)}px` }} />
                      </div>
                      <span className="text-[10px] text-ink-navy/35 leading-none">{fmtData(b.data, periodo)}</span>
                    </div>
                  )
                })}
              </div>
            )}
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
                    <th className="text-right px-4 py-3">Conti chiusi</th>
                    <th className="text-right px-4 py-3">Coperti</th>
                    <th className="text-right px-6 py-3">Incasso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...dati.andamento].reverse().map(b => (
                    <tr key={b.data} className="hover:bg-mist">
                      <td className="px-6 py-3 font-medium text-ink-navy">
                        {new Date(b.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                      </td>
                      <td className="text-right px-4 py-3 text-ink-navy/70">{b.ordini || '—'}</td>
                      <td className="text-right px-4 py-3 text-ink-navy/70">{b.coperti || '—'}</td>
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
