import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDipSession } from '@/lib/dipendenteAuth'

export async function GET(req: Request) {
  const session = await getDipSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const dip = await prisma.dipendente.findUnique({
    where: { id: session.dipendenteId },
    select: { id: true, nome: true, email: true, ruolo: true, fotoUrl: true, mustChangePassword: true, username: true },
  })
  if (!dip) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json({ dipendente: dip })
}
