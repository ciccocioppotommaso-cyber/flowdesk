import { getAuthUser } from '@/lib/getAuthUser'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const tavoli = await prisma.tavolo.findMany({
    where: { userId: user.id },
    orderBy: { numero: 'asc' },
  })
  return NextResponse.json({ tavoli })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { numero, posti, note } = await req.json()
  const tavolo = await prisma.tavolo.create({
    data: { userId: user.id, numero, posti: posti ?? 2, note },
  })
  return NextResponse.json({ tavolo })
}
