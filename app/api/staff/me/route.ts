import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token mancante' }, { status: 401 })

  const dipendente = await prisma.dipendente.findUnique({
    where: { token },
    include: {
      turni: { orderBy: { data: 'asc' } },
      richieste: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!dipendente) return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  if (dipendente.tokenExpiry && dipendente.tokenExpiry < new Date())
    return NextResponse.json({ error: 'Link scaduto' }, { status: 401 })

  return NextResponse.json({ dipendente })
}

export async function POST(req: Request) {
  // Invia richiesta (assenza o preferenza)
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token mancante' }, { status: 401 })

  const dipendente = await prisma.dipendente.findUnique({ where: { token } })
  if (!dipendente) return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  if (dipendente.tokenExpiry && dipendente.tokenExpiry < new Date())
    return NextResponse.json({ error: 'Link scaduto' }, { status: 401 })

  const { tipo, data, dataFine, note } = await req.json()
  const richiesta = await prisma.richiestaDipendente.create({
    data: {
      dipendenteId: dipendente.id,
      tipo,
      data: data ? new Date(data) : null,
      dataFine: dataFine ? new Date(dataFine) : null,
      note,
    },
  })
  return NextResponse.json({ richiesta })
}
