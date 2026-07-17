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
  const periodo = searchParams.get('periodo') ?? 'settimana'

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

  const ordini = await prisma.ordine.findMany({
    where: {
      userId: user.id,
      tipo: { in: ['asporto', 'delivery'] },
      createdAt: { gte: from },
    },
    select: {
      id: true,
      tipo: true,
      totale: true,
      status: true,
      createdAt: true,
    },
  })

  const asporto = ordini.filter(o => o.tipo === 'asporto')
  const delivery = ordini.filter(o => o.tipo === 'delivery')
  const nonConsegnati = ordini.filter(o => o.status === 'annullato' || o.status === 'non_consegnato')

  const totaleIncasso = ordini.reduce((s, o) => s + o.totale, 0)
  const spesaMedia = ordini.length > 0 ? totaleIncasso / ordini.length : 0
  const tassoNonConsegnati = ordini.length > 0 ? (nonConsegnati.length / ordini.length) * 100 : 0

  // Andamento per data
  const bucketMap: Record<string, { incasso: number; ordini: number; asporto: number; delivery: number }> = {}
  for (const o of ordini) {
    const k = serataKey(o.createdAt)
    if (!bucketMap[k]) bucketMap[k] = { incasso: 0, ordini: 0, asporto: 0, delivery: 0 }
    bucketMap[k].incasso += o.totale
    bucketMap[k].ordini += 1
    if (o.tipo === 'asporto') bucketMap[k].asporto += 1
    else bucketMap[k].delivery += 1
  }
  const andamento = Object.entries(bucketMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, v]) => ({ data, ...v }))

  // Fasce orarie
  const fasceMap: Record<string, number> = {}
  for (const o of ordini) {
    const h = o.createdAt.getUTCHours()
    const fascia = `${String(h).padStart(2, '0')}:00`
    fasceMap[fascia] = (fasceMap[fascia] ?? 0) + 1
  }
  const fasceOrarie = Object.entries(fasceMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ora, count]) => ({ ora, count }))

  return NextResponse.json({
    totaleIncasso,
    totaleOrdini: ordini.length,
    asportoCount: asporto.length,
    deliveryCount: delivery.length,
    spesaMedia,
    tassoNonConsegnati,
    andamento,
    fasceOrarie,
  })
}
