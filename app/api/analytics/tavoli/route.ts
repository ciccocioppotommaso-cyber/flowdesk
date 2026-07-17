import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

// Restituisce YYYY-MM per anno, YYYY-MM-DD altrimenti
function bucketKey(date: Date, byMonth: boolean): string {
  const d = new Date(date)
  // serata cutoff 04:00 UTC
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

  // Inizio di oggi UTC — i dati di oggi sono parziali, li escludiamo
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let from: Date
  if (periodo === 'anno') {
    from = new Date(today)
    from.setUTCMonth(from.getUTCMonth() - 12)
    from.setUTCDate(1) // primo del mese
  } else if (periodo === 'mese') {
    from = new Date(today)
    from.setUTCDate(from.getUTCDate() - 30)
  } else {
    // settimana: esattamente 7 giorni precedenti
    from = new Date(today)
    from.setUTCDate(from.getUTCDate() - 7)
  }

  // Pre-popola tutti i bucket con zero (così appaiono sempre nel grafico)
  const bucketMap: Record<string, { incasso: number; ordini: number; coperti: number }> = {}
  if (byMonth) {
    const d = new Date(from)
    for (let i = 0; i < 12; i++) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      bucketMap[key] = { incasso: 0, ordini: 0, coperti: 0 }
      d.setUTCMonth(d.getUTCMonth() + 1)
    }
  } else {
    const d = new Date(from)
    while (d < today) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      bucketMap[key] = { incasso: 0, ordini: 0, coperti: 0 }
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }

  const ordini = await prisma.ordine.findMany({
    where: {
      userId: user.id,
      tipo: 'tavolo',
      status: 'chiuso',
      createdAt: { gte: from, lt: today },
    },
    select: { id: true, totale: true, createdAt: true, closedAt: true },
  })

  const appuntamenti = await prisma.appuntamento.findMany({
    where: {
      userId: user.id,
      data: { gte: from, lt: today },
    },
    select: { status: true, coperti: true, data: true },
  })

  for (const o of ordini) {
    const k = bucketKey(o.createdAt, byMonth)
    if (bucketMap[k]) {
      bucketMap[k].incasso += o.totale
      bucketMap[k].ordini += 1
    }
  }
  for (const a of appuntamenti) {
    if (a.status === 'cancellato' || a.status === 'no_show') continue
    const k = bucketKey(a.data, byMonth)
    if (bucketMap[k]) bucketMap[k].coperti += a.coperti
  }

  const andamento = Object.entries(bucketMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, v]) => ({ data, ...v }))

  const totaleIncasso = ordini.reduce((s, o) => s + o.totale, 0)
  const copertiConfermati = appuntamenti
    .filter(a => a.status !== 'cancellato' && a.status !== 'no_show')
    .reduce((s, a) => s + a.coperti, 0)
  const noShow = appuntamenti.filter(a => a.status === 'no_show').length
  const tassoNoShow = appuntamenti.length > 0 ? (noShow / appuntamenti.length) * 100 : 0
  const spesaMediaPersona = copertiConfermati > 0 ? totaleIncasso / copertiConfermati : 0
  const ordiniConDurata = ordini.filter(o => o.closedAt != null)
  const durataMedia = ordiniConDurata.length > 0
    ? ordiniConDurata.reduce((s, o) => s + (o.closedAt!.getTime() - o.createdAt.getTime()), 0) / ordiniConDurata.length / 60000
    : 0

  return NextResponse.json({
    totaleIncasso,
    totaleOrdini: ordini.length,
    copertiConfermati,
    spesaMediaPersona,
    tassoNoShow,
    durataMediaMinuti: Math.round(durataMedia),
    andamento,
  })
}
