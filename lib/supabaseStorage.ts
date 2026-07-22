// Upload su Supabase Storage tramite API REST (fetch) — niente client @supabase/supabase-js,
// così non si trascina il realtime-client (che richiede WebSocket e rompe su alcune versioni
// di Node). Se le variabili non sono configurate, storageConfigurato = false e l'app ripiega
// sul salvataggio inline (base64).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const storageConfigurato = !!(url && serviceKey)

// Nome del bucket pubblico creato su Supabase → Storage
export const BUCKET = 'uploads'

// Carica un buffer e restituisce l'URL pubblico. Lancia se non configurato o se l'upload fallisce.
export async function uploadSuStorage(path: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!url || !serviceKey) throw new Error('Supabase Storage non configurato')
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: new Uint8Array(buffer),
  })
  if (!res.ok) {
    const dettaglio = await res.text().catch(() => '')
    throw new Error(`Upload fallito (${res.status}): ${dettaglio}`)
  }
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`
}
