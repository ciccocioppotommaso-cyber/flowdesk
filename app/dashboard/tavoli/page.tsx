'use client'
import { useEffect, useState } from 'react'

interface Tavolo {
  id: string
  numero: number
  posti: number
  note: string | null
}

interface Appuntamento {
  id: string
  clienteNome?: string
  data: string
  durata: number
  coperti?: number
  status: string
  tavoloId?: string | null
}

function toDateISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function overlap(a: Appuntamento, b: Appuntamento) {
  const aStart = new Date(a.data).getTime()
  const aEnd = aStart + a.durata * 60000
  const bStart = new Date(b.data).getTime()
  const bEnd = bStart + b.durata * 60000
  return aStart < bEnd && bStart < aEnd
}

export default function TavoliPage() {
  const [tavoli, setTavoli] = useState<Tavolo[]>([])
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Tavolo | null>(null)
  const [form, setForm] = useState({ numero: '', posti: '2', note: '' })
  const [saving, setSaving] = useState(false)
  const [dataSelezionata, setDataSelezionata] = useState(toDateISO(new Date()))
  const [dataInizializzata, setDataInizializzata] = useState(false)

  async function fetchAll() {
    const [resTavoli, resApp] = await Promise.all([
      fetch('/api/tavoli', { credentials: 'include' }),
      fetch('/api/appuntamenti', { credentials: 'include' }),
    ])
    const dt = await resTavoli.json()
    const da = await resApp.json()
    setTavoli(dt.tavoli ?? [])
    setAppuntamenti(da.appuntamenti ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // Dopo il caricamento: se oggi non ha prenotazioni, vai al prossimo giorno con prenotazioni
  useEffect(() => {
    if (dataInizializzata || appuntamenti.length === 0) return
    const oggi = toDateISO(new Date())
    const haOggi = appuntamenti.some(a => a.status !== 'cancellato' && toDateISO(new Date(a.data)) === oggi)
    if (!haOggi) {
      const prossimo = appuntamenti
        .filter(a => a.status !== 'cancellato' && toDateISO(new Date(a.data)) >= oggi)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())[0]
      if (prossimo) setDataSelezionata(toDateISO(new Date(prossimo.data)))
    }
    setDataInizializzata(true)
  }, [appuntamenti])

  function apriNuovo() {
    setEditing(null)
    const prossimo = tavoli.length > 0 ? Math.max(...tavoli.map(t => t.numero)) + 1 : 1
    setForm({ numero: String(prossimo), posti: '2', note: '' })
    setShowModal(true)
  }

  function apriModifica(t: Tavolo) {
    setEditing(t)
    setForm({ numero: String(t.numero), posti: String(t.posti), note: t.note ?? '' })
    setShowModal(true)
  }

  async function salva() {
    setSaving(true)
    const body = { numero: parseInt(form.numero), posti: parseInt(form.posti), note: form.note || null }
    if (editing) {
      await fetch(`/api/tavoli/${editing.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/tavoli', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setSaving(false)
    setShowModal(false)
    fetchAll()
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questo tavolo?')) return
    await fetch(`/api/tavoli/${id}`, { method: 'DELETE', credentials: 'include' })
    fetchAll()
  }

  // Appuntamenti del giorno selezionato (esclusi cancellati)
  const appDelGiorno = appuntamenti.filter(a =>
    a.status !== 'cancellato' &&
    toDateISO(new Date(a.data)) === dataSelezionata
  )

  // Per ogni tavolo: trova l'appuntamento attivo in quel giorno
  function appPerTavolo(tavoloId: string) {
    return appDelGiorno.filter(a => a.tavoloId === tavoloId)
  }

  const tavoliOccupati = tavoli.filter(t => appPerTavolo(t.id).length > 0).length
  const postiTotali = tavoli.reduce((s, t) => s + t.posti, 0)
  const postiOccupati = tavoli.reduce((s, t) => {
    const apps = appPerTavolo(t.id)
    return s + apps.reduce((ss, a) => ss + (a.coperti ?? 1), 0)
  }, 0)

  const oggi = toDateISO(new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Tavoli</h1>
          <p className="text-gray-500 text-sm mt-0.5">{tavoli.length} tavoli · {postiTotali} posti totali</p>
        </div>
        <button onClick={apriNuovo} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
          + Aggiungi tavolo
        </button>
      </div>

      {/* Selettore data + riepilogo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Occupazione per:</label>
          <input type="date" value={dataSelezionata} onChange={e => setDataSelezionata(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {dataSelezionata !== oggi && (
            <button onClick={() => setDataSelezionata(oggi)} className="text-xs text-indigo-600 hover:underline">Oggi</button>
          )}
        </div>
        <div className="flex gap-4 text-sm ml-auto">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />{tavoli.length - tavoliOccupati} liberi</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />{tavoliOccupati} occupati</span>
          <span className="text-gray-500">{postiOccupati}/{postiTotali} posti usati</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Caricamento...</div>
      ) : tavoli.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">🪑</div>
          <h3 className="text-lg font-semibold text-gray-800">Nessun tavolo configurato</h3>
          <p className="text-gray-500 text-sm mt-2">Aggiungi i tavoli del locale per assegnarli agli appuntamenti</p>
          <button onClick={apriNuovo} className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
            + Aggiungi primo tavolo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tavoli.map(t => {
            const apps = appPerTavolo(t.id)
            const occupato = apps.length > 0
            const copertiUsati = apps.reduce((s, a) => s + (a.coperti ?? 1), 0)
            const parziale = occupato && copertiUsati < t.posti

            return (
              <div key={t.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${
                occupato ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:shadow-md'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                    occupato ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {t.numero}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${occupato ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {occupato ? 'Occupato' : 'Libero'}
                    </span>
                    <button onClick={() => apriModifica(t)} className="text-gray-300 hover:text-indigo-600 p-1 rounded-lg transition-colors text-xs">✏️</button>
                    <button onClick={() => elimina(t.id)} className="text-gray-300 hover:text-red-500 p-1 rounded-lg transition-colors text-xs">🗑️</button>
                  </div>
                </div>

                <p className="font-semibold text-gray-800 text-sm">Tavolo {t.numero}</p>

                {/* Capacità: mostra coperti usati se parziale */}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-gray-500 text-xs">
                    🪑 {occupato ? (
                      parziale
                        ? <><span className="font-semibold text-orange-600">{copertiUsati}</span><span className="text-gray-400">/{t.posti} posti</span></>
                        : <><span className="font-semibold text-red-600">{copertiUsati}</span><span className="text-gray-400">/{t.posti} posti</span></>
                    ) : (
                      `${t.posti} posti`
                    )}
                  </span>
                </div>

                {t.note && <p className="text-gray-400 text-xs mt-0.5 truncate">{t.note}</p>}

                {/* Clienti assegnati */}
                {apps.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-red-100 space-y-1">
                    {apps.map(a => {
                      const ora = new Date(a.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <div key={a.id} className="text-xs text-red-700">
                          <span className="font-medium">{a.clienteNome || 'Cliente'}</span>
                          <span className="text-red-400 ml-1">· {ora} · {a.coperti ?? 1} pers.</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{editing ? 'Modifica tavolo' : 'Nuovo tavolo'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero tavolo</label>
                <input type="number" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posti a sedere</label>
                <input type="number" value={form.posti} onChange={e => setForm(f => ({ ...f, posti: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="es. vicino alla finestra, terrazza..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Annulla
              </button>
              <button onClick={salva} disabled={saving || !form.numero || !form.posti}
                className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
