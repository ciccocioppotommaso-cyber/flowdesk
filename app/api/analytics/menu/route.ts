import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

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

  const righe = await prisma.rigaOrdine.findMany({
    where: {
      ordine: {
        userId: user.id,
        createdAt: { gte: from },
      },
    },
    select: {
      nome: true,
      quantita: true,
      prezzo: true,
      piattoId: true,
    },
  })

  // Aggrega per piatto
  const piattoMap: Record<string, { nome: string; quantita: number; incasso: number }> = {}
  for (const r of righe) {
    if (!piattoMap[r.piattoId]) piattoMap[r.piattoId] = { nome: r.nome, quantita: 0, incasso: 0 }
    piattoMap[r.piattoId].quantita += r.quantita
    piattoMap[r.piattoId].incasso += r.prezzo * r.quantita
  }

  const piatti = Object.entries(piattoMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.quantita - a.quantita)

  const top10 = piatti.slice(0, 10)
  const bottom10 = piatti.slice(-10).reverse()

  return NextResponse.json({ top10, bottom10, totale: piatti.length })
}
