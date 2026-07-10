import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDipSession } from '@/lib/dipendenteAuth'

export async function GET() {
  const session = await getDipSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const domani = new Date(oggi)
  domani.setDate(domani.getDate() + 1)

  const timbrature = await prisma.timbratura.findMany({
    where: {
      dipendenteId: session.dipendenteId,
      timestamp: { gte: oggi, lt: domani },
    },
    orderBy: { timestamp: 'asc' },
  })

  return NextResponse.json({ timbrature })
}
