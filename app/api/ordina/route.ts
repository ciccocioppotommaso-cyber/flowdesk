import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — carica menu pubblico per publicId
export async function GET(req: Request) {
  const url = new URL(req.url)
  const publicId = url.searchParams.get('publicId')
  if (!publicId) return NextResponse.json({ error: 'publicId mancante' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { publicId },
    select: {
      id: true, nomeLocale: true, menuLogoUrl: true,
      menuColoreP: true, menuColoreS: true,
      menuCategorie: {
        orderBy: { ordine: 'asc' },
        include: {
          piatti: { where: { disponibile: true }, orderBy: { ordine: 'asc' } },
        },
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'Locale non trovato' }, { status: 404 })
  return NextResponse.json({ user })
}

// POST — crea ordine
export async function POST(req: Request) {
  const { publicId, tavolo, righe, note } = await req.json()
  const user = await prisma.user.findUnique({ where: { publicId } })
  if (!user) return NextResponse.json({ error: 'Locale non trovato' }, { status: 404 })

  // Controlla se il tavolo appartiene a un gruppo
  const tavoloNum = parseInt(tavolo)
  const tavoloRecord = isNaN(tavoloNum) ? null : await prisma.tavolo.findFirst({
    where: { userId: user.id, numero: tavoloNum },
    include: { gruppo: true },
  })

  const tavoloLabel = tavoloRecord?.gruppo ? `T${tavoloRecord.gruppo.label}` : tavolo
  const gruppoId = tavoloRecord?.gruppoId ?? null
  const tavoloId = tavoloRecord?.id ?? null
  const totale = righe.reduce((sum: number, r: any) => sum + r.prezzo * r.quantita, 0)

  // Se il tavolo è in un gruppo, cerca un ordine attivo del gruppo e aggiungi le righe
  if (gruppoId) {
    const ordineEsistente = await prisma.ordine.findFirst({
      where: { gruppoId, status: 'nuovo' },
      orderBy: { createdAt: 'desc' },
    })
    if (ordineEsistente) {
      await prisma.rigaOrdine.createMany({
        data: righe.map((r: any) => ({
          ordineId: ordineEsistente.id,
          piattoId: r.piattoId, nome: r.nome, prezzo: r.prezzo,
          quantita: r.quantita, note: r.note ?? '',
        })),
      })
      const ordineAggiornato = await prisma.ordine.update({
        where: { id: ordineEsistente.id },
        data: { totale: ordineEsistente.totale + totale },
        include: { righe: true },
      })
      return NextResponse.json({ ordine: ordineAggiornato })
    }
  }

  // Nessun ordine attivo: crea nuovo
  const ordine = await prisma.ordine.create({
    data: {
      userId: user.id,
      tavolo: tavoloLabel,
      tavoloId,
      gruppoId,
      totale,
      note,
      righe: {
        create: righe.map((r: any) => ({
          piattoId: r.piattoId, nome: r.nome, prezzo: r.prezzo,
          quantita: r.quantita, note: r.note ?? '',
        })),
      },
    },
    include: { righe: true },
  })
  return NextResponse.json({ ordine })
}
