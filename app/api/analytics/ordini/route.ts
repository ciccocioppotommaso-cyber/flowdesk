import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

function bucketKey(date: Date, byMonth: boolean): string {
  const d = new Date(date)
  if (d.getUTCHours() < 4) d.setUTCDate(d.getUTCDate() - 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  if (byMonth) return `${y}-${m}`
  return `${y}-${m}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function calcolaRange(periodo: string, rif: Date): { from: Date; to: Date } {
  if (periodo === 'anno') {
    const anno = rif.getUTCFullYear()
    return {
      from: new Date(Date.UTC(anno, 0, 1)),
      to: new Date(Date.UTC(anno + 1, 0, 1)),
    }
  }
  if (periodo === 'mese') {
    const anno = rif.getUTCFullYear()
    const mese = rif.getUTCMonth()
    return {
      from: new Date(Date.UTC(anno, mese, 1)),
      to: new Date(Date.UTC(anno, mese + 1, 1)),
    }
  }
  const d = new Date(rif)
  d.setUTCHours(0, 0, 0, 0)
  const dow = d.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const from = new Date(d)
  from.setUTCDate(d.getUTCDate() + diff)
  const to = new Date(from)
  to.setUTCDate(from.getUTCDate() + 7)
  return { from, to }
}

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? 'settimana'
  const rifStr = searchParams.get('riferimento')
  const rif = rifStr ? new Date(rifStr) : new Date()
  const byMonth = periodo === 'anno'

  const { from, to } = calcolaRange(periodo, rif)

  const oggi = new Date()
  oggi.setUTCHours(0, 0, 0, 0)
  const toEffettivo = to > oggi ? oggi : to

  const bucketMap: Record<string, { incasso: number; ordini: number; asporto: number; delivery: number }> = {}
  if (byMonth) {
    const d = new Date(from)
    while (d < to) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      if (!bucketMap[key]) bucketMap[key] = { incasso: 0, ordini: 0, asporto: 0, delivery: 0 }
      d.setUTCMonth(d.getUTCMonth() + 1)
    }
  } else {
    const d = new Date(from)
    while (d < to) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      bucketMap[key] = { incasso: 0, ordini: 0, asporto: 0, delivery: 0 }
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }

  const ordini = await prisma.ordine.findMany({
    where: {
      userId: user.id,
      tipo: { in: ['asporto', 'delivery'] },
      createdAt: { gte: from, lt: toEffettivo },
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

  const fasceMap: Record<string, number> = {}
  for (const o of ordini) {
    const h = o.createdAt.getUTCHours()
    const fascia = `${String(h).padStart(2, '0')}:00`
    fasceMap[fascia] = (fasceMap[fascia] ?? 0) + 1
  }
  const fasceOrarie = Object.entries(fasceMap)
    .filter(([, c]) => c > 0)
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
