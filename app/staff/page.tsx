'use client'
import { useState } from 'react'

export default function StaffLoginPage() {
  const [email, setEmail] = useState('')
  const [stato, setStato] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errore, setErrore] = useState('')

  async function invia() {
    setStato('loading')
    const res = await fetch('/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      setStato('sent')
    } else {
      const d = await res.json()
      setErrore(d.error || 'Errore')
      setStato('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👤</div>
          <h1 className="text-2xl font-bold text-gray-900">Area Staff</h1>
          <p className="text-gray-500 text-sm mt-1">Inserisci la tua email per ricevere il link di accesso</p>
        </div>

        {stato === 'sent' ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-lg font-semibold text-gray-900">Email inviata!</h2>
            <p className="text-gray-500 text-sm mt-2">Controlla la tua casella email e clicca il link per accedere. Il link è valido per 24 ore.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="La tua email aziendale"
              value={email}
              onChange={e => { setEmail(e.target.value); setStato('idle') }}
              onKeyDown={e => e.key === 'Enter' && email && invia()}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {stato === 'error' && (
              <p className="text-red-500 text-sm">{errore}</p>
            )}
            <button
              onClick={invia}
              disabled={!email || stato === 'loading'}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {stato === 'loading' ? 'Invio...' : 'Ricevi link di accesso'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
