import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

function bucketKey(date: Date, byMonth: boolean): string {
  const d = new Date(date)
  if (d.getUTCHours() < 4) d.setUTCDate(d.getUTCDate() - 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  if (byMonth) return `${y}-${m}`
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? 'settimana'
  const byMonth = periodo === 'anno'

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let from: Date
  if (periodo === 'anno') {
    from = new Date(today)
    from.setUTCMonth(from.getUTCMonth() - 12)
    from.setUTCDate(1)
  } else if (periodo === 'mese') {
    from = new Date(today)
    from.setUTCDate(from.getUTCDate() - 30)
  } else {
    from = new Date(today)
    from.setUTCDate(from.getUTCDate() - 7)
  }

  // Pre-popola tutti i bucket
  const bucketMap: Record<string, { incasso: number; ordini: number; asporto: number; delivery: number }> = {}
  if (byMonth) {
    const d = new Date(from)
    for (let i = 0; i < 12; i++) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      bucketMap[key] = { incasso: 0, ordini: 0, asporto: 0, delivery: 0 }
      d.setUTCMonth(d.getUTCMonth() + 1)
    }
  } else {
    const d = new Date(from)
    while (d < today) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      bucketMap[key] = { incasso: 0, ordini: 0, asporto: 0, delivery: 0 }
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }

  const ordini = await prisma.ordine.findMany({
    where: {
      userId: user.id,
      tipo: { in: ['asporto', 'delivery'] },
      createdAt: { gte: from, lt: today },
    },
    select: { id: true, tipo: true, totale: true, status: true, createdAt: true },
  })

  for (const o of ordini) {
    const k = bucketKey(o.createdAt, byMonth)
    if (bucketMap[k]) {
      bucketMap[k].incasso += o.totale
      bucketMap[k].ordini += 1
      if (o.tipo === 'asporto') bucketMap[k].asporto += 1
      else bucketMap[k].delivery += 1
    }
  }

  const andamento = Object.entries(bucketMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, v]) => ({ data, ...v }))

  // Fasce orarie (solo giorni precedenti)
  const fasceMap: Record<string, number> = {}
  for (const o of ordini) {
    const h = o.createdAt.getUTCHours()
    const fascia = `${String(h).padStart(2, '0')}:00`
    fasceMap[fascia] = (fasceMap[fascia] ?? 0) + 1
  }
  // Pre-popola fasce 08-23 e 00-03
  const fascePredefinite = ['08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','00','01','02','03']
  for (const h of fascePredefinite) {
    const k = `${h}:00`
    if (!(k in fasceMap)) fasceMap[k] = 0
  }
  const fasceOrarie = Object.entries(fasceMap)
    .filter(([, c]) => c > 0) // mostra solo le fasce con almeno un ordine
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ora, count]) => ({ ora, count }))

  const asportoCount = ordini.filter(o => o.tipo === 'asporto').length
  const deliveryCount = ordini.filter(o => o.tipo === 'delivery').length
  const nonConsegnati = ordini.filter(o => o.status === 'annullato' || o.status === 'non_consegnato').length
  const totaleIncasso = ordini.reduce((s, o) => s + o.totale, 0)
  const spesaMedia = ordini.length > 0 ? totaleIncasso / ordini.length : 0
  const tassoNonConsegnati = ordini.length > 0 ? (nonConsegnati / ordini.length) * 100 : 0

  return NextResponse.json({
    totaleIncasso,
    totaleOrdini: ordini.length,
    asportoCount,
    deliveryCount,
    spesaMedia,
    tassoNonConsegnati,
    andamento,
    fasceOrarie,
  })
}
