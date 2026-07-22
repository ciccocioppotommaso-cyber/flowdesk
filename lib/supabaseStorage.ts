import { createClient } from '@supabase/supabase-js'

// Client Supabase per lo Storage (solo lato server, usa la service_role key).
// Se le variabili non sono configurate, storageConfigurato = false e l'app
// ripiega sul salvataggio inline (base64) senza rompersi.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const storageConfigurato = !!(url && serviceKey)

// Nome del bucket pubblico da creare su Supabase → Storage
export const BUCKET = 'uploads'

export function getSupabaseStorage() {
  if (!url || !serviceKey) throw new Error('Supabase Storage non configurato')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}
