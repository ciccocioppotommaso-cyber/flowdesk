import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const ordini = await prisma.ordine.findMany({
    where: { userId: user.id },
    include: { righe: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ ordini })
}
