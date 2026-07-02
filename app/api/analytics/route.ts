import { getAuthUser } from '@/lib/getAuthUser'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const ora = new Date()
  const inizioAnno = new Date(ora.getFullYear(), 0, 1)

  const [appuntamenti, preventivi] = await Promise.all([
    prisma.appuntamento.findMany({
      where: { userId: user.id, data: { gte: inizioAnno } },
      select: { data: true, status: true, coperti: true, tavoloId: true },
    }),
    prisma.preventivo.findMany({
      where: { userId: user.id, status: 'accettato' },
      select: { createdAt: true, totale: true, tipo: true },
    }),
  ])

  // Prenotazioni per mese (ultimi 6 mesi)
  const perMese: Record<string, { totale: number; noShow: number; completati: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ora.getFullYear(), ora.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    perMese[key] = { totale: 0, noShow: 0, completati: 0 }
  }
  for (const a of appuntamenti) {
    const key = `${a.data.getFullYear()}-${String(a.data.getMonth() + 1).padStart(2, '0')}`
    if (!perMese[key]) continue
    perMese[key].totale++
    if (a.status === 'no_show') perMese[key].noShow++
    if (a.status === 'completato') perMese[key].completati++
  }

  // Giorno della settimana più gettonato
  const perGiorno = [0, 0, 0, 0, 0, 0, 0] // dom=0 ... sab=6
  for (const a of appuntamenti) perGiorno[a.data.getDay()]++

  // Ora più gettonata
  const perOra: Record<number, number> = {}
  for (const a of appuntamenti) {
    const h = a.data.getHours()
    perOra[h] = (perOra[h] ?? 0) + 1
  }

  // Totali generali
  const totaleApp = appuntamenti.length
  const noShow = appuntamenti.filter(a => a.status === 'no_show').length
  const completati = appuntamenti.filter(a => a.status === 'completato').length
  const tassoNoShow = totaleApp > 0 ? Math.round((noShow / totaleApp) * 100) : 0

  // Revenue (da preventivi accettati)
  const revenuePerMese: Record<string, number> = {}
  for (const key of Object.keys(perMese)) revenuePerMese[key] = 0
  for (const p of preventivi) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
    if (revenuePerMese[key] !== undefined) revenuePerMese[key] += p.totale
  }

  const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const giornoTop = perGiorno.indexOf(Math.max(...perGiorno))
  const oraTopEntry = Object.entries(perOra).sort((a, b) => b[1] - a[1])[0]
  const oraTop = oraTopEntry ? parseInt(oraTopEntry[0]) : null

  return NextResponse.json({
    totaleApp,
    noShow,
    completati,
    tassoNoShow,
    giornoTop: giornoTop >= 0 ? GIORNI[giornoTop] : null,
    oraTop: oraTop !== null ? `${String(oraTop).padStart(2, '0')}:00` : null,
    perMese: Object.entries(perMese).map(([mese, v]) => ({ mese, ...v, revenue: revenuePerMese[mese] ?? 0 })),
  })
}
