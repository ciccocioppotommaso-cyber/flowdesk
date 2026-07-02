'use client'

import { useEffect, useState } from 'react'

const GIORNI_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const GIORNI_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

interface Appuntamento {
  id: string
  clienteNome?: string
  clienteEmail?: string
  servizio?: string
  data: string
  durata: number
  status: string
  note?: string
  coperti?: number
  allergie?: string
  occasione?: string
  tavoloId?: string | null
}

interface Tavolo {
  id: string
  numero: number
  posti: number
  note: string | null
}

function addDays(date: Date, days: number) {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}
function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}
function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  confermato: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  completato: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  no_show: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-400' },
  cancellato: { bg: 'bg-red-100', text: 'text-red-500', dot: 'bg-red-400' },
}

export default function Calendario() {
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Appuntamento | null>(null)
  const [showNuovo, setShowNuovo] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState('')
  const [vistaMessile, setVistaMensile] = useState(false)
  const [giornoAperto, setGiornoAperto] = useState<Date | null>(null)
  const [attesaBanner, setAttesaBanner] = useState<{ count: number; data: string } | null>(null)

  // Mini calendar state
  const [miniMonth, setMiniMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })

  // Week view state
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  const [tavoli, setTavoli] = useState<Tavolo[]>([])
  const [formApp, setFormApp] = useState({ clienteNome: '', clienteEmail: '', servizio: '', data: '', ora: '20:00', durata: 120, note: '', coperti: 2, allergie: '', occasione: '', tavoloId: '' })

  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  async function fetchAll() {
    const [resApp, resTavoli] = await Promise.all([
      fetch('/api/appuntamenti', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/tavoli', { credentials: 'include' }),
    ])
    const dataApp = await resApp.json()
    const dataTavoli = await resTavoli.json()
    setAppuntamenti(dataApp.appuntamenti ?? [])
    setTavoli(dataTavoli.tavoli ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  function appForDay(day: Date) {
    return appuntamenti
      .filter(a => isSameDay(new Date(a.data), day))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
  }

  function hasApp(day: Date) {
    return appuntamenti.some(a => isSameDay(new Date(a.data), day) && a.status !== 'cancellato')
  }

  function getMiniMonthGrid() {
    const year = miniMonth.getFullYear(), m = miniMonth.getMonth()
    const firstDay = new Date(year, m, 1)
    const lastDay = new Date(year, m + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const cells: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, m, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  function jumpToDay(day: Date) {
    setWeekStart(getMonday(day))
  }

  async function handleSaveApp() {
    await fetch('/api/appuntamenti', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formApp, data: new Date(`${formApp.data}T${formApp.ora}`).toISOString() }),
    })
    setShowNuovo(false)
    setFormApp({ clienteNome: '', clienteEmail: '', servizio: '', data: '', ora: '20:00', durata: 120, note: '', coperti: 2, allergie: '', occasione: '', tavoloId: '' })
    await fetchAll()
  }

  async function handleStatusApp(id: string, status: string) {
    const app = appuntamenti.find(a => a.id === id)
    await fetch(`/api/appuntamenti/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchAll()
    setSelected(prev => prev ? { ...prev, status } : null)

    // Dopo cancellazione: controlla lista d'attesa per quella data
    if (status === 'cancellato' && app) {
      const dataStr = new Date(app.data).toISOString().split('T')[0]
      const res = await fetch(`/api/lista-attesa?attivi=true`, { credentials: 'include' })
      const data = await res.json()
      const inAttesaPerData = (data.lista ?? []).filter((i: { data: string }) => {
        return new Date(i.data).toISOString().split('T')[0] === dataStr
      })
      if (inAttesaPerData.length > 0) {
        setAttesaBanner({ count: inAttesaPerData.length, data: dataStr })
      }
    }
  }

  async function handleDeleteApp(id: string) {
    await fetch(`/api/appuntamenti/${id}`, { method: 'DELETE', credentials: 'include' })
    await fetchAll()
    setSelected(null)
  }

  function openNuovoConData(day: Date) {
    const iso = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
    setFormApp(f => ({ ...f, data: iso }))
    setShowNuovo(true)
  }

  const miniGrid = getMiniMonthGrid()

  const weekLabel = (() => {
    const fine = addDays(weekStart, 6)
    if (weekStart.getMonth() === fine.getMonth()) {
      return `${weekStart.getDate()}–${fine.getDate()} ${MESI[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    }
    return `${weekStart.getDate()} ${MESI[weekStart.getMonth()]} – ${fine.getDate()} ${MESI[fine.getMonth()]} ${fine.getFullYear()}`
  })()

  const appProssimi = appuntamenti
    .filter(a => new Date(a.data) >= today && a.status === 'confermato')
    .length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Banner lista d'attesa dopo cancellazione */}
      {attesaBanner && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-amber-800">
                {attesaBanner.count === 1 ? '1 persona in lista d\'attesa' : `${attesaBanner.count} persone in lista d'attesa`} per questa data
              </p>
              <p className="text-sm text-amber-700">Vuoi avvisarle che si è liberato un posto?</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setAttesaBanner(null)} className="text-sm text-amber-600 hover:text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
              Ignora
            </button>
            <a href="/dashboard/clienti/lista-attesa" className="text-sm bg-amber-500 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">
              Vai alla lista →
            </a>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-500 mt-0.5">
            {appProssimi > 0
              ? <span className="text-indigo-600 font-medium">{appProssimi} prenotazioni in programma</span>
              : 'Nessuna prenotazione in programma'}
          </p>
        </div>
        <button onClick={() => { setFormApp(f => ({ ...f, data: '' })); setShowNuovo(true) }}
          className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          + Nuova prenotazione
        </button>
      </div>

      {loading ? <div className="text-center text-gray-400 py-12">Caricamento...</div> : (
        <div className="flex gap-5">

          {/* ── MINI CALENDARIO ── */}
          <div className="w-56 shrink-0 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              {/* Navigazione mese */}
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setMiniMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="text-gray-400 hover:text-gray-700 text-sm px-1">‹</button>
                <span className="text-xs font-semibold text-gray-700">
                  {MESI[miniMonth.getMonth()].slice(0,3)} {miniMonth.getFullYear()}
                </span>
                <button onClick={() => setMiniMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="text-gray-400 hover:text-gray-700 text-sm px-1">›</button>
              </div>
              {/* Giorni della settimana */}
              <div className="grid grid-cols-7 mb-1">
                {GIORNI_SHORT.map(g => (
                  <div key={g} className="text-center text-[10px] font-semibold text-gray-400">{g[0]}</div>
                ))}
              </div>
              {/* Griglia giorni */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {miniGrid.map((day, i) => {
                  if (!day) return <div key={i} />
                  const isToday = isSameDay(day, today)
                  const isInWeek = day >= weekStart && day <= addDays(weekStart, 6)
                  const hasDot = hasApp(day)
                  return (
                    <button key={i} onClick={() => jumpToDay(day)}
                      className={`relative flex flex-col items-center justify-center h-7 rounded-md text-xs font-medium transition-colors ${
                        isToday ? 'bg-indigo-600 text-white' :
                        isInWeek ? 'bg-indigo-50 text-indigo-700' :
                        'text-gray-600 hover:bg-gray-100'
                      }`}>
                      {day.getDate()}
                      {hasDot && !isToday && (
                        <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isInWeek ? 'bg-indigo-400' : 'bg-indigo-300'}`} />
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Torna ad oggi */}
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => { setWeekStart(getMonday(today)); setMiniMonth(new Date(today.getFullYear(), today.getMonth(), 1)) }}
                  className="flex-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                  Oggi
                </button>
                <button onClick={() => setVistaMensile(true)}
                  className="flex-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                  Espandi
                </button>
              </div>
            </div>

            {/* Legenda */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Legenda</p>
              {Object.entries(STATUS_COLORS).map(([key, c]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                  <span className="text-xs text-gray-600 capitalize">{key === 'no_show' ? 'No-show' : key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── VISTA SETTIMANA ── */}
          <div className="flex-1 min-w-0">
            {/* Navigazione settimana */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setWeekStart(d => addDays(d, -7))}
                className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                ← Prec.
              </button>
              <span className="text-sm font-semibold text-gray-700">{weekLabel}</span>
              <button onClick={() => setWeekStart(d => addDays(d, 7))}
                className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Succ. →
              </button>
            </div>

            {/* Griglia settimana */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, di) => {
                const dayApps = appForDay(day)
                const isT = isSameDay(day, today)
                const isPast = day < today && !isT
                const totaleCoperti = dayApps.filter(a => a.status === 'confermato').reduce((s, a) => s + (a.coperti ?? 1), 0)

                return (
                  <div key={di} className="min-h-40">
                    {/* Header giorno */}
                    <div
                      onClick={() => openNuovoConData(day)}
                      className={`rounded-t-xl px-2 py-2 text-center cursor-pointer transition-colors mb-1 ${
                        isT ? 'bg-indigo-600 text-white' :
                        isPast ? 'bg-gray-100 text-gray-400' :
                        'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider">{GIORNI_SHORT[di]}</p>
                      <p className={`text-lg font-bold leading-tight ${isT ? 'text-white' : ''}`}>{day.getDate()}</p>
                      {totaleCoperti > 0 && (
                        <p className={`text-[9px] font-semibold mt-0.5 ${isT ? 'text-indigo-200' : 'text-orange-500'}`}>
                          🪑 {totaleCoperti}
                        </p>
                      )}
                    </div>

                    {/* Appuntamenti del giorno */}
                    <div className="space-y-1">
                      {dayApps.map(a => {
                        const c = STATUS_COLORS[a.status] ?? STATUS_COLORS.confermato
                        const ora = new Date(a.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                        const tavolo = a.tavoloId ? tavoli.find(t => t.id === a.tavoloId) : null
                        return (
                          <div key={a.id} onClick={() => setSelected(a)}
                            className={`${c.bg} ${c.text} rounded-lg px-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity`}>
                            <p className="text-[11px] font-bold leading-tight truncate">{ora}</p>
                            <p className="text-[11px] font-semibold truncate leading-tight">{a.clienteNome || 'Cliente'}</p>
                            <div className="flex gap-1.5 flex-wrap mt-0.5">
                              {(a.coperti ?? 1) > 1 && <p className="text-[10px] opacity-70">🪑 {a.coperti}</p>}
                              {tavolo && <p className="text-[10px] opacity-70">T{tavolo.numero}</p>}
                            </div>
                          </div>
                        )
                      })}
                      {/* Bottone aggiungi */}
                      {!isPast && (
                        <button onClick={() => openNuovoConData(day)}
                          className="w-full text-[11px] text-gray-300 hover:text-indigo-400 py-1 text-center border border-dashed border-gray-200 hover:border-indigo-300 rounded-lg transition-colors">
                          +
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA MENSILE ── */}
      {vistaMessile && (() => {
        const anno = miniMonth.getFullYear()
        const mese = miniMonth.getMonth()
        const primoGiorno = new Date(anno, mese, 1)
        const ultimoGiorno = new Date(anno, mese + 1, 0)
        const startOffset = (primoGiorno.getDay() + 6) % 7
        const celle: (Date | null)[] = []
        for (let i = 0; i < startOffset; i++) celle.push(null)
        for (let d = 1; d <= ultimoGiorno.getDate(); d++) celle.push(new Date(anno, mese, d))
        while (celle.length % 7 !== 0) celle.push(null)

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <button onClick={() => setMiniMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="text-gray-400 hover:text-gray-700 text-lg px-2">‹</button>
                <h2 className="text-lg font-bold text-gray-900">{MESI[mese]} {anno}</h2>
                <button onClick={() => setMiniMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="text-gray-400 hover:text-gray-700 text-lg px-2">›</button>
                <button onClick={() => setVistaMensile(false)} className="text-gray-400 hover:text-gray-600 text-xl ml-4">✕</button>
              </div>

              {/* Griglia */}
              <div className="p-4">
                {/* Header giorni */}
                <div className="grid grid-cols-7 mb-2">
                  {GIORNI_SHORT.map(g => (
                    <div key={g} className="text-center text-xs font-semibold text-gray-400 py-1">{g}</div>
                  ))}
                </div>
                {/* Celle */}
                <div className="grid grid-cols-7 gap-1">
                  {celle.map((day, i) => {
                    if (!day) return <div key={i} />
                    const dayApps = appForDay(day).filter(a => a.status !== 'cancellato')
                    const isT = isSameDay(day, today)
                    const isPast = day < today && !isT
                    const copertiTot = dayApps.reduce((s, a) => s + (a.coperti ?? 1), 0)

                    return (
                      <button key={i} onClick={() => { setGiornoAperto(day); }}
                        className={`relative rounded-xl p-1.5 min-h-16 text-left transition-colors border ${
                          isT ? 'bg-indigo-600 border-indigo-600 text-white' :
                          isPast ? 'bg-gray-50 border-gray-100 text-gray-400' :
                          dayApps.length > 0 ? 'bg-white border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50' :
                          'bg-white border-gray-100 hover:bg-gray-50'
                        }`}>
                        <p className={`text-xs font-bold mb-1 ${isT ? 'text-white' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                          {day.getDate()}
                        </p>
                        {dayApps.length > 0 && (
                          <div className="space-y-0.5">
                            {dayApps.slice(0, 2).map(a => {
                              const c = STATUS_COLORS[a.status] ?? STATUS_COLORS.confermato
                              const ora = new Date(a.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                              return (
                                <div key={a.id} className={`${isT ? 'bg-white/20' : c.bg} rounded px-1 py-0.5`}>
                                  <p className={`text-[10px] font-semibold truncate leading-tight ${isT ? 'text-white' : c.text}`}>
                                    {ora} {a.clienteNome?.split(' ')[0]}
                                  </p>
                                </div>
                              )
                            })}
                            {dayApps.length > 2 && (
                              <p className={`text-[10px] font-semibold ${isT ? 'text-indigo-200' : 'text-gray-400'}`}>
                                +{dayApps.length - 2} altri
                              </p>
                            )}
                          </div>
                        )}
                        {copertiTot > 0 && (
                          <p className={`text-[9px] mt-0.5 font-semibold ${isT ? 'text-indigo-200' : 'text-orange-400'}`}>
                            🪑 {copertiTot}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── DETTAGLIO GIORNO (dalla vista mensile) ── */}
      {giornoAperto && (() => {
        const dayApps = appForDay(giornoAperto)
        const label = `${GIORNI_FULL[giornoAperto.getDay()]} ${giornoAperto.getDate()} ${MESI[giornoAperto.getMonth()]} ${giornoAperto.getFullYear()}`
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 capitalize">{label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{dayApps.filter(a => a.status !== 'cancellato').length} prenotazioni</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setGiornoAperto(null); openNuovoConData(giornoAperto) }}
                    className="text-xs text-indigo-600 font-semibold px-2 py-1 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                    + Nuova
                  </button>
                  <button onClick={() => setGiornoAperto(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {dayApps.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nessuna prenotazione per questo giorno</p>
                ) : dayApps.map(a => {
                  const c = STATUS_COLORS[a.status] ?? STATUS_COLORS.confermato
                  const ora = new Date(a.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={a.id} onClick={() => { setGiornoAperto(null); setVistaMensile(false); setSelected(a) }}
                      className={`${c.bg} ${c.text} rounded-xl px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{ora}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/50`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold mt-0.5">{a.clienteNome || 'Cliente'}</p>
                      {a.servizio && <p className="text-xs opacity-70">{a.servizio}</p>}
                      <div className="flex gap-3 mt-1 text-xs opacity-80">
                        {(a.coperti ?? 1) > 0 && <span>🪑 {a.coperti ?? 1}</span>}
                        {a.allergie && a.allergie.toLowerCase() !== 'nessuna' && <span>⚠️ {a.allergie}</span>}
                        {a.occasione && <span>🎉 {a.occasione}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── MODALE DETTAGLIO APPUNTAMENTO ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selected.clienteNome || 'Appuntamento'}</h2>
                {selected.clienteEmail && <p className="text-xs text-gray-400">{selected.clienteEmail}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl mt-1">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Prenotazione</p>
                <p className="text-sm font-semibold text-indigo-900">
                  {GIORNI_FULL[new Date(selected.data).getDay()]}{' '}
                  {new Date(selected.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                  alle {new Date(selected.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {selected.servizio && <p className="text-sm text-indigo-700">📋 {selected.servizio} · {selected.durata} min</p>}
                {(selected.coperti ?? 1) > 0 && <p className="text-sm text-indigo-700">🪑 {selected.coperti ?? 1} {(selected.coperti ?? 1) === 1 ? 'persona' : 'persone'}</p>}
                {selected.tavoloId && (() => { const t = tavoli.find(t => t.id === selected.tavoloId); return t ? <p className="text-sm text-indigo-700">🍽️ Tavolo {t.numero} ({t.posti} posti)</p> : null })()}
                {selected.allergie && selected.allergie.toLowerCase() !== 'nessuna' && <p className="text-sm text-red-600">⚠️ {selected.allergie}</p>}
                {selected.occasione && <p className="text-sm text-purple-600">🎉 {selected.occasione}</p>}
                {selected.note && <p className="text-xs text-indigo-400 mt-1 italic">{selected.note}</p>}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stato</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'confermato', label: '✓ Confermato' },
                    { key: 'completato', label: '✅ Completato' },
                    { key: 'no_show', label: '👻 No-show' },
                    { key: 'cancellato', label: '✕ Cancellato' },
                  ].map(({ key, label }) => {
                    const c = STATUS_COLORS[key]
                    return (
                      <button key={key} onClick={() => handleStatusApp(selected.id, key)}
                        className={`text-sm py-2 rounded-lg font-medium transition-colors ${
                          selected.status === key
                            ? `${c.bg} ${c.text}`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {tavoli.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tavolo assegnato</p>
                  <select
                    value={selected.tavoloId ?? ''}
                    onChange={async e => {
                      const tavoloId = e.target.value || null
                      const res = await fetch(`/api/appuntamenti/${selected.id}`, {
                        method: 'PATCH', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tavoloId }),
                      })
                      if (!res.ok) {
                        const err = await res.json()
                        if (err.conflitto) {
                          alert('⚠️ Tavolo già occupato in questo orario. Scegline un altro.')
                          return
                        }
                      }
                      setSelected(prev => prev ? { ...prev, tavoloId } : null)
                      await fetchAll()
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Nessun tavolo —</option>
                    {tavoli.map(t => {
                      const occupato = appuntamenti.some(a =>
                        a.id !== selected.id &&
                        a.tavoloId === t.id &&
                        a.status !== 'cancellato' &&
                        Math.abs(new Date(a.data).getTime() - new Date(selected.data).getTime()) < (a.durata + 30) * 60000
                      )
                      return (
                        <option key={t.id} value={t.id} disabled={occupato}>
                          {occupato ? '🔴 ' : '🟢 '}Tavolo {t.numero} · {t.posti} posti{t.note ? ` · ${t.note}` : ''}{occupato ? ' (occupato)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
              <button onClick={() => handleDeleteApp(selected.id)}
                className="text-sm text-gray-400 font-medium py-2 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" title="Elimina">
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE NUOVO APPUNTAMENTO ── */}
      {showNuovo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nuova prenotazione</h2>
              <button onClick={() => setShowNuovo(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome cliente *</label>
                  <input type="text" placeholder="Mario Rossi" value={formApp.clienteNome}
                    onChange={e => setFormApp({ ...formApp, clienteNome: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" placeholder="mario@email.com" value={formApp.clienteEmail}
                    onChange={e => setFormApp({ ...formApp, clienteEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" value={formApp.data} onChange={e => setFormApp({ ...formApp, data: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ora *</label>
                  <input type="time" value={formApp.ora} onChange={e => setFormApp({ ...formApp, ora: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° persone</label>
                  <input type="number" min={1} value={formApp.coperti}
                    onChange={e => setFormApp({ ...formApp, coperti: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durata</label>
                  <select value={formApp.durata} onChange={e => setFormApp({ ...formApp, durata: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {[60, 90, 120, 150, 180].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo / Servizio</label>
                <input type="text" placeholder="Prenotazione tavolo, Cena di lavoro…" value={formApp.servizio}
                  onChange={e => setFormApp({ ...formApp, servizio: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergie</label>
                  <input type="text" placeholder="nessuna" value={formApp.allergie}
                    onChange={e => setFormApp({ ...formApp, allergie: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occasione</label>
                  <input type="text" placeholder="compleanno, anniversario…" value={formApp.occasione}
                    onChange={e => setFormApp({ ...formApp, occasione: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {tavoli.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tavolo</label>
                  <select value={formApp.tavoloId} onChange={e => setFormApp({ ...formApp, tavoloId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Nessun tavolo assegnato —</option>
                    {tavoli.map(t => (
                      <option key={t.id} value={t.id}>Tavolo {t.numero} ({t.posti} posti{t.note ? ` · ${t.note}` : ''})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note interne</label>
                <textarea value={formApp.note} onChange={e => setFormApp({ ...formApp, note: e.target.value })}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowNuovo(false)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Annulla</button>
              <button onClick={handleSaveApp} disabled={!formApp.clienteNome || !formApp.data || !formApp.ora}
                className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                Salva prenotazione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
