'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/app/components/Logo'

interface Turno {
  id: string
  data: string
  oraInizio: string
  oraFine: string
  ruolo: string | null
  note: string | null
}

interface Richiesta {
  id: string
  tipo: string
  data: string | null
  dataFine: string | null
  note: string | null
  oraInizio: string | null
  oraFine: string | null
  status: string
  createdAt: string
}

interface Dipendente {
  id: string
  nome: string
  ruolo: string | null
  fotoUrl: string | null
  mustChangePassword: boolean
  turni: Turno[]
  richieste: Richiesta[]
}

interface GiornoDisponibile {
  data: string
  oraInizio: string
  oraFine: string
  note: string
}

const TIPO_LABEL: Record<string, string> = {
  assenza: 'Assenza',
  malattia: 'Malattia',
  permesso: 'Permesso',
  ferie: 'Ferie',
  preferenza_orario: 'Preferenza orario',
}
const STATUS_COLOR: Record<string, string> = {
  in_attesa: 'bg-amber-50 text-amber-600 border border-amber-200',
  approvata: 'bg-green-50 text-green-600 border border-green-200',
  rifiutata: 'bg-ink-navy/5 text-ink-navy/40 border border-ink-navy/10',
}
const STATUS_LABEL: Record<string, string> = {
  in_attesa: 'In attesa',
  approvata: 'Approvata',
  rifiutata: 'Rifiutata',
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const inp = 'w-full border border-ink-navy/15 rounded-xl px-3 py-2.5 text-sm text-ink-navy placeholder:text-ink-navy/30 focus:outline-none focus:ring-2 focus:ring-electric-blue/40 focus:border-electric-blue/50 transition bg-white'

export default function DipendenteDashboard() {
  const router = useRouter()
  const [dipendente, setDipendente] = useState<Dipendente | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'turni' | 'disponibilita' | 'richieste' | 'account'>('turni')

  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [errorePassword, setErrorePassword] = useState('')
  const [salvandoPassword, setSalvandoPassword] = useState(false)
  const [passwordCambiata, setPasswordCambiata] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tipo: 'malattia', data: '', dataFine: '', note: '', oraInizio: '', oraFine: '' })
  const [editingRichiesta, setEditingRichiesta] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [meseDisp, setMeseDisp] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })
  const [giorniDisp, setGiorniDisp] = useState<GiornoDisponibile[]>([])
  const [giornoDettaglio, setGiornoDettaglio] = useState<string | null>(null)
  const [savingDisp, setSavingDisp] = useState(false)
  const [dispSalvata, setDispSalvata] = useState(false)
  const [dispModificata, setDispModificata] = useState(false)

  const [meseCal, setMeseCal] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })
  const [turnoSelezionato, setTurnoSelezionato] = useState<Turno | null>(null)

  async function fetchProfilo() {
    const res = await fetch('/api/dipendente/profilo', { credentials: 'include' })
    if (res.status === 401) { router.push('/dipendente/login'); return }
    const d = await res.json()
    setDipendente(d.dipendente)
    setLoading(false)
    if (d.dipendente?.mustChangePassword) setTab('account')
  }

  async function fetchDisponibilita() {
    const mese = toISO(meseDisp)
    const res = await fetch(`/api/dipendente/disponibilita?mese=${mese}`, { credentials: 'include' })
    if (!res.ok) return
    const d = await res.json()
    setGiorniDisp(d.giorni ?? [])
    setDispSalvata(d.giorni?.length > 0)
    setDispModificata(false)
  }

  useEffect(() => { fetchProfilo() }, [])
  useEffect(() => { if (tab === 'disponibilita') fetchDisponibilita() }, [tab, meseDisp])

  async function handleLogout() {
    await fetch('/api/dipendente/logout', { method: 'POST', credentials: 'include' })
    router.push('/dipendente/login')
  }

  async function cambiaPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrorePassword('')
    if (nuovaPassword.length < 6) { setErrorePassword('La password deve avere almeno 6 caratteri'); return }
    if (nuovaPassword !== confermaPassword) { setErrorePassword('Le password non coincidono'); return }
    setSalvandoPassword(true)
    const res = await fetch('/api/dipendente/set-password', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuovaPassword }),
    })
    setSalvandoPassword(false)
    if (!res.ok) { setErrorePassword('Errore durante il salvataggio'); return }
    setPasswordCambiata(true)
    setNuovaPassword('')
    setConfermaPassword('')
    fetchProfilo()
  }

  async function inviaRichiesta() {
    setSaving(true)
    try {
      const method = editingRichiesta ? 'PATCH' : 'POST'
      const body = editingRichiesta ? { id: editingRichiesta, ...form } : form
      const res = await fetch('/api/dipendente/richieste', {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Errore'); return }
      setShowForm(false)
      setEditingRichiesta(null)
      setForm({ tipo: 'malattia', data: '', dataFine: '', note: '', oraInizio: '', oraFine: '' })
      fetchProfilo()
    } finally { setSaving(false) }
  }

  async function eliminaRichiesta(id: string) {
    if (!confirm('Rimuovere questa richiesta?')) return
    await fetch(`/api/dipendente/richieste?id=${id}`, { method: 'DELETE', credentials: 'include' })
    fetchProfilo()
  }

  function apriModifica(r: Richiesta) {
    setEditingRichiesta(r.id)
    setForm({
      tipo: r.tipo,
      data: r.data ? r.data.split('T')[0] : '',
      dataFine: r.dataFine ? r.dataFine.split('T')[0] : '',
      note: r.note ?? '',
      oraInizio: r.oraInizio ?? '',
      oraFine: r.oraFine ?? '',
    })
    setShowForm(true)
  }

  function toggleGiorno(dataStr: string) {
    setDispModificata(true)
    setGiorniDisp(prev => {
      const esiste = prev.find(g => g.data === dataStr)
      if (esiste) { if (giornoDettaglio === dataStr) setGiornoDettaglio(null); return prev.filter(g => g.data !== dataStr) }
      return [...prev, { data: dataStr, oraInizio: '', oraFine: '', note: '' }]
    })
  }

  function aggiornaGiorno(dataStr: string, campo: keyof GiornoDisponibile, valore: string) {
    setDispModificata(true)
    setGiorniDisp(prev => prev.map(g => g.data === dataStr ? { ...g, [campo]: valore } : g))
  }

  async function salvaDisponibilita() {
    setSavingDisp(true)
    await fetch('/api/dipendente/disponibilita', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mese: toISO(meseDisp), giorni: giorniDisp }),
    })
    setSavingDisp(false)
    setDispSalvata(true)
    setDispModificata(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-mist flex items-center justify-center">
      <p className="text-ink-navy/35 text-sm font-mono">Caricamento...</p>
    </div>
  )
  if (!dipendente) return null

  const oggi = new Date().toISOString().split('T')[0]

  const primoGiornoMese = new Date(meseCal.getFullYear(), meseCal.getMonth(), 1)
  const ultimoGiornoMese = new Date(meseCal.getFullYear(), meseCal.getMonth() + 1, 0)
  const offsetInizio = primoGiornoMese.getDay() === 0 ? 6 : primoGiornoMese.getDay() - 1
  const totaleCelle = Math.ceil((offsetInizio + ultimoGiornoMese.getDate()) / 7) * 7

  const primoGiornoDisp = new Date(meseDisp.getFullYear(), meseDisp.getMonth(), 1)
  const ultimoGiornoDisp = new Date(meseDisp.getFullYear(), meseDisp.getMonth() + 1, 0)
  const offsetDisp = primoGiornoDisp.getDay() === 0 ? 6 : primoGiornoDisp.getDay() - 1
  const totaleCelleDisp = Math.ceil((offsetDisp + ultimoGiornoDisp.getDate()) / 7) * 7

  return (
    <div className="min-h-screen bg-mist">

      {/* Header */}
      <div className="bg-white border-b border-ink-navy/10 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={28} withWordmark={false} />
            <div className="w-px h-5 bg-ink-navy/10" />
            {dipendente.fotoUrl ? (
              <img src={dipendente.fotoUrl} alt={dipendente.nome} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-electric-blue/10 text-electric-blue flex items-center justify-center text-sm font-bold">
                {dipendente.nome[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-ink-navy leading-tight">
                {dipendente.nome.split(' ')[0]}
              </p>
              {dipendente.ruolo && <p className="text-xs text-ink-navy/40">{dipendente.ruolo}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dipendente.mustChangePassword && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium border border-amber-200">
                Cambia password
              </span>
            )}
            <button onClick={() => setShowForm(true)}
              className="bg-electric-blue text-white text-sm font-semibold px-3 py-1.5 rounded-xl hover:bg-electric-blue/90 transition-colors">
              + Richiesta
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Tab */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'turni', label: 'I miei turni' },
            { key: 'disponibilita', label: 'Disponibilità' },
            { key: 'richieste', label: 'Richieste' },
            { key: 'account', label: 'Account' },
          ] as { key: typeof tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors relative ${
                tab === t.key
                  ? 'bg-electric-blue text-white shadow-sm'
                  : 'bg-white border border-ink-navy/10 text-ink-navy/60 hover:border-ink-navy/20 hover:text-ink-navy'
              }`}>
              {t.label}
              {t.key === 'account' && dipendente.mustChangePassword && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
              )}
            </button>
          ))}
        </div>

        {/* ── TAB TURNI ── */}
        {tab === 'turni' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-ink-navy/8">
                <button onClick={() => setMeseCal(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-mist text-ink-navy/40 hover:text-ink-navy transition-colors">←</button>
                <span className="font-semibold text-ink-navy text-sm capitalize">
                  {meseCal.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setMeseCal(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-mist text-ink-navy/40 hover:text-ink-navy transition-colors">→</button>
              </div>
              <div className="grid grid-cols-7 border-b border-ink-navy/8">
                {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((g, i) => (
                  <div key={i} className={`py-2.5 text-center text-xs font-bold ${i >= 5 ? 'text-electric-blue/60' : 'text-ink-navy/30'}`}>{g}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: totaleCelle }, (_, idx) => {
                  const giornoNum = idx - offsetInizio + 1
                  const isDelMese = giornoNum >= 1 && giornoNum <= ultimoGiornoMese.getDate()
                  const dataCorrente = isDelMese
                    ? `${meseCal.getFullYear()}-${String(meseCal.getMonth() + 1).padStart(2, '0')}-${String(giornoNum).padStart(2, '0')}`
                    : null
                  const turniGiorno = dataCorrente ? dipendente.turni.filter(t => t.data.split('T')[0] === dataCorrente) : []
                  const isOggi = dataCorrente === oggi
                  const isWeekend = idx % 7 >= 5
                  return (
                    <div key={idx} className={`min-h-[72px] p-1.5 border-b border-r border-ink-navy/6
                      ${!isDelMese ? 'bg-mist/60' : isWeekend ? 'bg-electric-blue/[0.03]' : 'bg-white'}`}>
                      {isDelMese && (
                        <>
                          <p className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1
                            ${isOggi ? 'bg-electric-blue text-white' : isWeekend ? 'text-electric-blue/60' : 'text-ink-navy/70'}`}>
                            {giornoNum}
                          </p>
                          {turniGiorno.map((t, i) => (
                            <div key={i} onClick={() => setTurnoSelezionato(turnoSelezionato?.id === t.id ? null : t)}
                              className="bg-electric-blue text-white rounded-lg px-1.5 py-1 text-xs font-semibold mb-1 cursor-pointer hover:bg-electric-blue/80 transition-colors">
                              {t.oraInizio}–{t.oraFine}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {dipendente.turni.length === 0 && (
              <div className="bg-white rounded-2xl border border-ink-navy/10 p-10 text-center shadow-sm">
                <p className="text-3xl mb-3">📅</p>
                <p className="text-ink-navy/40 text-sm">Nessun turno assegnato</p>
              </div>
            )}

            {turnoSelezionato && (
              <div className="bg-white rounded-2xl border border-electric-blue/20 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink-navy text-sm">
                      {new Date(turnoSelezionato.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-electric-blue font-bold text-xl mt-1">{turnoSelezionato.oraInizio} – {turnoSelezionato.oraFine}</p>
                    {turnoSelezionato.ruolo && <p className="text-ink-navy/50 text-sm mt-0.5">{turnoSelezionato.ruolo}</p>}
                    {turnoSelezionato.note && <p className="text-ink-navy/35 text-xs mt-1">{turnoSelezionato.note}</p>}
                  </div>
                  <button onClick={() => setTurnoSelezionato(null)} className="text-ink-navy/30 hover:text-ink-navy transition-colors text-lg">✕</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB DISPONIBILITÀ ── */}
        {tab === 'disponibilita' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-navy/40 px-1">Tocca i giorni in cui sei disponibile — diventano verdi.</p>
            <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-ink-navy/8">
                <button onClick={() => { setMeseDisp(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); setGiornoDettaglio(null) }}
                  className="p-1.5 rounded-lg hover:bg-mist text-ink-navy/40 hover:text-ink-navy transition-colors">←</button>
                <span className="font-semibold text-ink-navy text-sm capitalize">
                  {meseDisp.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => { setMeseDisp(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); setGiornoDettaglio(null) }}
                  className="p-1.5 rounded-lg hover:bg-mist text-ink-navy/40 hover:text-ink-navy transition-colors">→</button>
              </div>
              <div className="grid grid-cols-7 border-b border-ink-navy/8">
                {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((g, i) => (
                  <div key={i} className={`py-2 text-center text-xs font-bold ${i >= 5 ? 'text-electric-blue/60' : 'text-ink-navy/30'}`}>{g}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: totaleCelleDisp }, (_, idx) => {
                  const giornoNum = idx - offsetDisp + 1
                  const isDelMese = giornoNum >= 1 && giornoNum <= ultimoGiornoDisp.getDate()
                  const dataStr = isDelMese
                    ? `${meseDisp.getFullYear()}-${String(meseDisp.getMonth() + 1).padStart(2, '0')}-${String(giornoNum).padStart(2, '0')}`
                    : null
                  const isDisp = dataStr ? giorniDisp.some(g => g.data === dataStr) : false
                  const hasOrario = dataStr ? giorniDisp.some(g => g.data === dataStr && g.oraInizio) : false
                  const isOggi = dataStr === oggi
                  const isWeekend = idx % 7 >= 5
                  return (
                    <div key={idx}
                      onClick={() => { if (!isDelMese || !dataStr) return; toggleGiorno(dataStr) }}
                      className={`min-h-[52px] p-1 border-b border-r border-ink-navy/6 flex flex-col items-center justify-start pt-1.5 transition-colors
                        ${!isDelMese ? 'bg-mist/60' : isDisp ? 'bg-green-100 cursor-pointer hover:bg-green-200' : isWeekend ? 'bg-electric-blue/[0.03] cursor-pointer hover:bg-electric-blue/[0.07]' : 'bg-white cursor-pointer hover:bg-mist'}`}>
                      {isDelMese && (
                        <>
                          <p className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                            ${isOggi ? 'bg-electric-blue text-white' : isDisp ? 'text-green-700' : isWeekend ? 'text-electric-blue/50' : 'text-ink-navy/70'}`}>
                            {giornoNum}
                          </p>
                          {hasOrario && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <button onClick={salvaDisponibilita} disabled={savingDisp || (!dispModificata && dispSalvata)}
              className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-colors
                ${!dispModificata && dispSalvata
                  ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                  : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'}`}>
              {savingDisp ? 'Salvataggio...' : (!dispModificata && dispSalvata) ? '✅ Salvato' : 'Salva disponibilità'}
            </button>

            {giorniDisp.length > 0 && (
              <div className="space-y-2">
                {[...giorniDisp].sort((a, b) => a.data.localeCompare(b.data)).map(g => {
                  const isOpen = giornoDettaglio === g.data
                  const haOrario = !!g.oraInizio
                  return (
                    <div key={g.data} className="bg-white border border-ink-navy/10 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          <span className="text-sm font-medium text-ink-navy">
                            {new Date(g.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${haOrario ? 'bg-green-100 text-green-700' : 'bg-mist text-ink-navy/50'}`}>
                            {haOrario ? `${g.oraInizio} – ${g.oraFine}` : 'Tutto il giorno'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setGiornoDettaglio(isOpen ? null : g.data)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/15 font-semibold transition-colors">
                            {isOpen ? 'Chiudi' : haOrario ? '✏️ Orario' : 'Decidi orario'}
                          </button>
                          <button onClick={() => toggleGiorno(g.data)} className="text-ink-navy/20 hover:text-red-400 p-1 transition-colors">✕</button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t border-ink-navy/8 px-3 py-3 bg-mist/50 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-ink-navy/50 mb-1 font-medium">Dalle</label>
                              <input type="time" value={g.oraInizio} onChange={e => aggiornaGiorno(g.data, 'oraInizio', e.target.value)}
                                className={inp} />
                            </div>
                            <div>
                              <label className="block text-xs text-ink-navy/50 mb-1 font-medium">Alle</label>
                              <input type="time" value={g.oraFine} onChange={e => aggiornaGiorno(g.data, 'oraFine', e.target.value)}
                                className={inp} />
                            </div>
                          </div>
                          <input value={g.note} onChange={e => aggiornaGiorno(g.data, 'note', e.target.value)}
                            placeholder="Note (opzionale)..."
                            className={inp} />
                          {haOrario && (
                            <button onClick={() => { aggiornaGiorno(g.data, 'oraInizio', ''); aggiornaGiorno(g.data, 'oraFine', '') }}
                              className="text-xs text-ink-navy/35 hover:text-ink-navy/60 transition-colors">
                              Rimuovi orario → Tutto il giorno
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB RICHIESTE ── */}
        {tab === 'richieste' && (
          <div className="space-y-3">
            {dipendente.richieste.length === 0 ? (
              <div className="bg-white rounded-2xl border border-ink-navy/10 p-10 text-center shadow-sm">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-ink-navy/40 text-sm">Nessuna richiesta inviata</p>
              </div>
            ) : dipendente.richieste.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-navy text-sm">{TIPO_LABEL[r.tipo] || r.tipo}</p>
                    {r.tipo === 'preferenza_orario' ? (
                      r.oraInizio && <p className="text-ink-navy/50 text-xs mt-0.5">{r.oraInizio} – {r.oraFine}{r.data && `, ${new Date(r.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`}</p>
                    ) : (
                      r.data && (
                        <p className="text-ink-navy/50 text-xs mt-0.5">
                          {new Date(r.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                          {r.dataFine && r.dataFine !== r.data && ` → ${new Date(r.dataFine).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`}
                        </p>
                      )
                    )}
                    {r.note && <p className="text-ink-navy/35 text-xs mt-1 truncate">{r.note}</p>}
                    {(r.status === 'in_attesa' || r.tipo === 'preferenza_orario') && (
                      <div className="flex gap-2 mt-2">
                        {r.status === 'in_attesa' && (
                          <button onClick={() => apriModifica(r)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/15 font-semibold transition-colors">
                            Modifica
                          </button>
                        )}
                        <button onClick={() => eliminaRichiesta(r.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-semibold transition-colors">
                          Rimuovi
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB ACCOUNT ── */}
        {tab === 'account' && (
          <div className="space-y-4">
            {dipendente.mustChangePassword && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                <p className="font-semibold">Imposta la tua password personale</p>
                <p className="mt-1 text-amber-700/80">Il responsabile ha impostato una password temporanea. Creane una tua prima di continuare.</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-ink-navy">
                {dipendente.mustChangePassword ? 'Imposta nuova password' : 'Cambia password'}
              </h2>
              {passwordCambiata && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                  ✅ Password aggiornata con successo
                </div>
              )}
              <form onSubmit={cambiaPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Nuova password</label>
                  <input type="password" value={nuovaPassword} onChange={e => setNuovaPassword(e.target.value)}
                    autoComplete="new-password" minLength={6} required className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Conferma password</label>
                  <input type="password" value={confermaPassword} onChange={e => setConfermaPassword(e.target.value)}
                    autoComplete="new-password" required className={inp} />
                </div>
                {errorePassword && (
                  <p className="text-sm text-red-500">{errorePassword}</p>
                )}
                <button type="submit" disabled={salvandoPassword}
                  className="w-full bg-electric-blue text-white font-semibold py-3 rounded-xl hover:bg-electric-blue/90 disabled:opacity-50 text-sm transition-colors">
                  {salvandoPassword ? 'Salvataggio...' : 'Salva password'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm p-5">
              <h2 className="font-bold text-ink-navy mb-2">Il tuo profilo</h2>
              <div className="flex items-center gap-3">
                {dipendente.fotoUrl ? (
                  <img src={dipendente.fotoUrl} alt={dipendente.nome} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-electric-blue/10 text-electric-blue flex items-center justify-center font-bold">
                    {dipendente.nome[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-ink-navy">{dipendente.nome}</p>
                  {dipendente.ruolo && <p className="text-xs text-ink-navy/40">{dipendente.ruolo}</p>}
                </div>
              </div>
            </div>

            <button onClick={handleLogout}
              className="w-full border border-ink-navy/15 text-ink-navy/50 font-semibold py-3 rounded-2xl hover:bg-ink-navy/5 hover:text-ink-navy hover:border-ink-navy/20 text-sm transition-colors">
              Esci dall'account
            </button>
          </div>
        )}
      </div>

      {/* Modal nuova richiesta */}
      {showForm && (
        <div className="fixed inset-0 bg-ink-navy/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-ink-navy">{editingRichiesta ? 'Modifica richiesta' : 'Nuova richiesta'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className={inp}>
                  <option value="malattia">Malattia</option>
                  <option value="assenza">Assenza</option>
                  <option value="permesso">Permesso</option>
                  <option value="ferie">Ferie</option>
                  <option value="preferenza_orario">Preferenza orario</option>
                </select>
              </div>
              {form.tipo === 'preferenza_orario' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Giorno (opzionale)</label>
                    <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                      className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Dalle</label>
                      <input type="time" value={form.oraInizio} onChange={e => setForm(f => ({ ...f, oraInizio: e.target.value }))}
                        className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Alle</label>
                      <input type="time" value={form.oraFine} onChange={e => setForm(f => ({ ...f, oraFine: e.target.value }))}
                        className={inp} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Dal</label>
                    <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                      className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Al (opzionale)</label>
                    <input type="date" value={form.dataFine} onChange={e => setForm(f => ({ ...f, dataFine: e.target.value }))}
                      className={inp} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-ink-navy/50 mb-1.5 uppercase tracking-wide">Note</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Descrivi la tua richiesta..." rows={3}
                  className={`${inp} resize-none`} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); setEditingRichiesta(null); setForm({ tipo: 'malattia', data: '', dataFine: '', note: '', oraInizio: '', oraFine: '' }) }}
                className="flex-1 border border-ink-navy/15 text-ink-navy/60 font-semibold py-2.5 rounded-xl hover:bg-mist text-sm transition-colors">
                Annulla
              </button>
              <button onClick={inviaRichiesta} disabled={saving || (form.tipo !== 'preferenza_orario' && !form.data)}
                className="flex-1 bg-electric-blue text-white font-semibold py-2.5 rounded-xl hover:bg-electric-blue/90 text-sm disabled:opacity-50 transition-colors">
                {saving ? 'Invio...' : 'Invia richiesta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
