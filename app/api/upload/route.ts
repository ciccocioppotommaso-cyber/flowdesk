import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/getAuthUser'
import { getSupabaseStorage, storageConfigurato, BUCKET } from '@/lib/supabaseStorage'

// POST — riceve un'immagine (data URL base64, già compressa lato client) e la
// carica su Supabase Storage, restituendo l'URL pubblico. Se lo storage non è
// configurato, risponde 503 e il client ripiega sul salvataggio inline (base64).
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!storageConfigurato) return NextResponse.json({ error: 'Storage non configurato' }, { status: 503 })

  const { dataUrl } = await req.json()
  if (typeof dataUrl !== 'string') return NextResponse.json({ error: 'Immagine mancante' }, { status: 400 })

  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/)
  if (!match) return NextResponse.json({ error: 'Formato immagine non valido' }, { status: 400 })

  const contentType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  // Limite di sicurezza: 6MB (le immagini arrivano già compresse ~<100KB)
  if (buffer.byteLength > 6 * 1024 * 1024) return NextResponse.json({ error: 'Immagine troppo grande' }, { status: 413 })

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  try {
    const supabase = getSupabaseStorage()
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false })
    if (error) {
      console.error('[upload]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (e) {
    console.error('[upload] exception', e)
    return NextResponse.json({ error: 'Upload fallito' }, { status: 500 })
  }
}
