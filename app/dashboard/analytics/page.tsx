'use client'
import { useEffect, useState } from 'react'

interface MeseData {
  mese: string
  totale: number
  noShow: number
  completati: number
  revenue: number
}

interface Analytics {
  totaleApp: number
  noShow: number
  completati: number
  tassoNoShow: number
  giornoTop: string | null
  oraTop: string | null
  perMese: MeseData[]
}

const MESI: Record<string, string> = {
  '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago',
  '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Caricamento...</div>
  if (!data) return null

  const maxTotale = Math.max(...data.perMese.map(m => m.totale), 1)
  const maxRevenue = Math.max(...data.perMese.map(m => m.revenue), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Statistiche sull&apos;andamento del tuo locale</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Prenotazioni totali</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data.totaleApp}</p>
          <p className="text-xs text-gray-400 mt-1">da inizio anno</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Tasso no-show</p>
          <p className={`text-3xl font-bold mt-1 ${data.tassoNoShow > 15 ? 'text-red-500' : data.tassoNoShow > 8 ? 'text-amber-500' : 'text-green-500'}`}>
            {data.tassoNoShow}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{data.noShow} su {data.totaleApp}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Giorno più gettonato</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{data.giornoTop ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">giorno della settimana</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Orario più richiesto</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{data.oraTop ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">fascia oraria</p>
        </div>
      </div>

      {/* Grafico prenotazioni per mese */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Prenotazioni per mese</h2>
        <div className="flex items-end gap-3 h-40">
          {data.perMese.map(m => {
            const label = MESI[m.mese.split('-')[1]] ?? m.mese
            const hTot = Math.round((m.totale / maxTotale) * 130)
            const hNS = m.totale > 0 ? Math.round((m.noShow / m.totale) * hTot) : 0
            return (
              <div key={m.mese} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{m.totale}</span>
                <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden" style={{ height: `${Math.max(hTot, 4)}px` }}>
                  <div className="w-full bg-red-300" style={{ height: `${hNS}px` }} title={`No-show: ${m.noShow}`} />
                  <div className="w-full bg-indigo-500" style={{ height: `${hTot - hNS}px` }} />
                </div>
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> Prenotazioni</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> No-show</span>
        </div>
      </div>

      {/* Grafico revenue */}
      {maxRevenue > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Revenue da preventivi accettati</h2>
          <div className="flex items-end gap-3 h-32">
            {data.perMese.map(m => {
              const label = MESI[m.mese.split('-')[1]] ?? m.mese
              const h = Math.round((m.revenue / maxRevenue) * 110)
              return (
                <div key={m.mese} className="flex-1 flex flex-col items-center gap-1">
                  {m.revenue > 0 && <span className="text-xs text-gray-500 font-medium">€{m.revenue.toLocaleString('it-IT')}</span>}
                  <div className="w-full flex flex-col justify-end" style={{ height: '110px' }}>
                    <div className="w-full bg-emerald-500 rounded-t-lg" style={{ height: `${Math.max(h, m.revenue > 0 ? 4 : 0)}px` }} />
                  </div>
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabella dettaglio mesi */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Dettaglio mensile</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-6 py-3">Mese</th>
              <th className="text-right px-4 py-3">Prenotazioni</th>
              <th className="text-right px-4 py-3">Completate</th>
              <th className="text-right px-4 py-3">No-show</th>
              <th className="text-right px-6 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...data.perMese].reverse().map(m => (
              <tr key={m.mese} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-800">{MESI[m.mese.split('-')[1]]} {m.mese.split('-')[0]}</td>
                <td className="text-right px-4 py-3 text-gray-700">{m.totale}</td>
                <td className="text-right px-4 py-3 text-green-600">{m.completati}</td>
                <td className="text-right px-4 py-3 text-red-500">{m.noShow}</td>
                <td className="text-right px-6 py-3 text-emerald-600 font-medium">
                  {m.revenue > 0 ? `€${m.revenue.toLocaleString('it-IT')}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
