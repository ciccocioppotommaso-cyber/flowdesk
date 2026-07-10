import { getAuthUser } from '@/lib/getAuthUser'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const url = new URL(req.url)
  const data = url.searchParams.get('data') // YYYY-MM-DD, default oggi

  const giorno = data ? new Date(data) : new Date()
  giorno.setHours(0, 0, 0, 0)
  const domani = new Date(giorno)
  domani.setDate(domani.getDate() + 1)

  const timbrature = await prisma.timbratura.findMany({
    where: {
      userId: user.id,
      timestamp: { gte: giorno, lt: domani },
    },
    include: { dipendente: { select: { nome: true, ruolo: true, fotoUrl: true } } },
    orderBy: { timestamp: 'desc' },
  })

  return NextResponse.json({ timbrature })
}
