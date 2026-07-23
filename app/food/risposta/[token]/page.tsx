'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RispostaPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const azioneParam = searchParams.get('azione') as 'accetta' | 'rifiuta' | null

  const [stato, setStato] = useState<'idle' | 'loading' | 'accettato' | 'rifiutato' | 'errore' | 'usato'>('idle')
  const [messaggio, setMessaggio] = useState('')

  useEffect(() => {
    if (azioneParam) handleAzione(azioneParam)
  }, [azioneParam])

  async function handleAzione(azione: 'accetta' | 'rifiuta') {
    setStato('loading')
    try {
      const res = await fetch(`/api/public/risposta/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azione }),
      })
      const data = await res.json()
      if (res.status === 409) { setStato('usato'); return }
      if (!res.ok) { setStato('errore'); setMessaggio(data.error ?? 'Errore'); return }
      setStato(data.azione)
    } catch {
      setStato('errore')
      setMessaggio('Errore di rete — riprova più tardi')
    }
  }

  if (stato === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Elaborazione in corso...</p>
        </div>
      </div>
    )
  }

  if (stato === 'accettato') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ottimo, ci vediamo!</h1>
          <p className="text-gray-500 text-sm">Hai accettato la proposta. Riceverai una email di conferma a breve.</p>
        </div>
      </div>
    )
  }

  if (stato === 'rifiutato') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Richiesta annullata</h1>
          <p className="text-gray-500 text-sm">Hai rifiutato la proposta. Puoi contattarci direttamente per trovare un&apos;alternativa.</p>
        </div>
      </div>
    )
  }

  if (stato === 'usato') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link già utilizzato</h1>
          <p className="text-gray-500 text-sm">Questo link è già stato usato in precedenza. Contattaci direttamente per assistenza.</p>
        </div>
      </div>
    )
  }

  if (stato === 'errore') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Qualcosa è andato storto</h1>
          <p className="text-gray-500 text-sm">{messaggio || 'Link non valido o scaduto.'}</p>
        </div>
      </div>
    )
  }

  // stato === 'idle' (nessun param URL, mostra i pulsanti)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center space-y-6">
        <div className="text-5xl">📋</div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Risposta alla proposta</h1>
          <p className="text-gray-500 text-sm">Cosa vuoi fare con questa proposta?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleAzione('rifiuta')}
            className="flex-1 border-2 border-red-300 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors">
            ✕ Rifiuto
          </button>
          <button
            onClick={() => handleAzione('accetta')}
            className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors">
            ✓ Accetto
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense><RispostaPage /></Suspense>
}
