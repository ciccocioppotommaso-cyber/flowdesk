'use client'
import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Timbratura {
  id: string
  tipo: string
  timestamp: string
  dipendente: { nome: string; ruolo: string | null; fotoUrl: string | null }
}

export default function TimbraturePage() {
  const [token, setToken] = useState<string | null>(null)
  const [secondi, setSecondi] = useState(60)
  const [timbrature, setTimbrature] = useState<Timbratura[]>([])
  const [dataFiltro, setDataFiltro] = useState(() => new Date().toISOString().split('T')[0])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  async function fetchToken() {
    const res = await fetch('/api/qr-timbratura/token', { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      setToken(d.token)
    }
  }

  async function fetchStorico() {
    const res = await fetch(`/api/qr-timbratura/storico?data=${dataFiltro}`, { credentials: 'include' })
    if (res.ok) {
      const d = await res.json()
      setTimbrature(d.timbrature)
    }
  }

  useEffect(() => {
    fetchToken()
    fetchStorico()

    // Sincronizza il countdown con il minuto reale
    const syncCountdown = () => {
      const now = new Date()
      const secsLeft = 60 - now.getSeconds()
      setSecondi(secsLeft)
    }
    syncCountdown()

    const tick = setInterval(() => {
      setSecondi(prev => {
        if (prev <= 1) {
          fetchToken()
          return 60
        }
        return prev - 1
      })
    }, 1000)

    // Aggiorna storico ogni 10 secondi
    const storTick = setInterval(fetchStorico, 10000)

    intervalRef.current = tick
    return () => { clearInterval(tick); clearInterval(storTick) }
  }, [])

  useEffect(() => { fetchStorico() }, [dataFiltro])

  const progressPercent = (secondi / 60) * 100
  const circumference = 2 * Math.PI * 22
  const strokeDash = (progressPercent / 100) * circumference

  const oggi = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-navy">Timbrature</h1>
        <p className="text-sm text-ink-navy/40 mt-0.5">Il QR si aggiorna ogni minuto — i dipendenti lo scansionano dall'area personale</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* QR Code */}
        <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm p-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-sm font-semibold text-ink-navy/50 uppercase tracking-wide">QR Timbratura</p>
            <p className="text-xs text-ink-navy/30 mt-0.5">Mostra questo schermo ai dipendenti</p>
          </div>

          {token ? (
            <div className="p-4 bg-white rounded-2xl border-2 border-ink-navy/8 shadow-sm">
              <QRCodeSVG
                value={token}
                size={220}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            </div>
          ) : (
            <div className="w-[252px] h-[252px] bg-mist rounded-2xl animate-pulse" />
          )}

          {/* Countdown */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="22" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="24" cy="24" r="22" fill="none"
                  stroke={secondi <= 10 ? '#f59e0b' : '#3b82f6'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  style={{ transition: 'stroke-dasharray 0.9s linear' }}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${secondi <= 10 ? 'text-amber-500' : 'text-electric-blue'}`}>
                {secondi}
              </span>
            </div>
            <p className="text-xs text-ink-navy/30">secondi al prossimo QR</p>
          </div>
        </div>

        {/* Storico oggi in tempo reale */}
        <div className="bg-white rounded-2xl border border-ink-navy/10 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-navy/8 flex items-center justify-between">
            <p className="font-semibold text-ink-navy">Registro presenze</p>
            <input
              type="date"
              value={dataFiltro}
              max={oggi}
              onChange={e => setDataFiltro(e.target.value)}
              className="text-xs border border-ink-navy/15 rounded-lg px-2 py-1.5 text-ink-navy focus:outline-none focus:ring-2 focus:ring-electric-blue/40"
            />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-ink-navy/6">
            {timbrature.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <p className="text-3xl">🕐</p>
                <p className="text-sm text-ink-navy/30">Nessuna timbratura</p>
              </div>
            ) : timbrature.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${t.tipo === 'entrata' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-navy truncate">{t.dipendente.nome}</p>
                  {t.dipendente.ruolo && <p className="text-xs text-ink-navy/40">{t.dipendente.ruolo}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.tipo === 'entrata' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {t.tipo === 'entrata' ? '→ Entrata' : '← Uscita'}
                  </span>
                  <p className="text-xs text-ink-navy/30 mt-1">
                    {new Date(t.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
