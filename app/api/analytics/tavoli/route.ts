import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

function serataKey(date: Date): string {
  const d = new Date(date)
  if (d.getUTCHours() < 4) d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? 'settimana' // settimana | mese | anno

  const now = new Date()
  let from: Date
  if (periodo === 'anno') {
    from = new Date(now)
    from.setFullYear(from.getFullYear() - 1)
  } else if (periodo === 'mese') {
    from = new Date(now)
    from.setMonth(from.getMonth() - 1)
  } else {
    from = new Date(now)
    from.setDate(from.getDate() - 7)
  }

  // Ordini tavolo chiusi nel periodo
  const ordini = await prisma.ordine.findMany({
    where: {
      userId: user.id,
      tipo: 'tavolo',
      status: 'chiuso',
      createdAt: { gte: from },
    },
    select: {
      id: true,
      totale: true,
      createdAt: true,
      closedAt: true,
      tavoloId: true,
      gruppoId: true,
    },
  })

  // Appuntamenti per coperti e no-show
  const appuntamenti = await prisma.appuntamento.findMany({
    where: {
      userId: user.id,
      data: { gte: from, lte: now },
    },
    select: { status: true, coperti: true, data: true },
  })

  const totaleIncasso = ordini.reduce((s, o) => s + o.totale, 0)
  const totaleOrdini = ordini.length

  const copertiConfermati = appuntamenti.filter(a => a.status !== 'cancellato' && a.status !== 'no_show').reduce((s, a) => s + a.coperti, 0)
  const noShow = appuntamenti.filter(a => a.status === 'no_show').length
  const tassoNoShow = appuntamenti.length > 0 ? (noShow / appuntamenti.length) * 100 : 0

  const spesaMediaPersona = copertiConfermati > 0 ? totaleIncasso / copertiConfermati : 0

  // Durata media tavolo
  const ordiniConDurata = ordini.filter(o => o.closedAt != null)
  const durataTotaleMs = ordiniConDurata.reduce((s, o) => {
    return s + (o.closedAt!.getTime() - o.createdAt.getTime())
  }, 0)
  const duratamMedia = ordiniConDurata.length > 0 ? durataTotaleMs / ordiniConDurata.length / 60000 : 0 // minuti

  // Andamento per bucket
  const bucketMap: Record<string, { incasso: number; ordini: number; coperti: number }> = {}
  for (const o of ordini) {
    const k = serataKey(o.createdAt)
    if (!bucketMap[k]) bucketMap[k] = { incasso: 0, ordini: 0, coperti: 0 }
    bucketMap[k].incasso += o.totale
    bucketMap[k].ordini += 1
  }
  for (const a of appuntamenti) {
    if (a.status === 'cancellato' || a.status === 'no_show') continue
    const k = serataKey(a.data)
    if (!bucketMap[k]) bucketMap[k] = { incasso: 0, ordini: 0, coperti: 0 }
    bucketMap[k].coperti += a.coperti
  }
  const andamento = Object.entries(bucketMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, v]) => ({ data, ...v }))

  return NextResponse.json({
    totaleIncasso,
    totaleOrdini,
    copertiConfermati,
    spesaMediaPersona,
    tassoNoShow,
    durataMediaMinuti: Math.round(duratamMedia),
    andamento,
  })
}
