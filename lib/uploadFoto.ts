import { comprimiImmagine } from './comprimiImmagine'

// Comprime la foto lato client e la carica su Supabase Storage tramite /api/upload,
// restituendo l'URL pubblico da salvare. Se lo storage non è configurato (o l'upload
// fallisce) ripiega sul data URL base64, così la funzione resta sempre utilizzabile.
export async function preparaFoto(file: File, maxLato?: number, quality?: number): Promise<string> {
  const dataUrl = await comprimiImmagine(file, maxLato, quality)
  try {
    const res = await fetch('/api/upload', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    })
    if (res.ok) {
      const j = await res.json()
      if (typeof j.url === 'string' && j.url) return j.url
    }
  } catch { /* storage non disponibile → fallback base64 */ }
  return dataUrl
}
