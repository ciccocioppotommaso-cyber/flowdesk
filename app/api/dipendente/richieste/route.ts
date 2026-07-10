import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDipSession } from '@/lib/dipendenteAuth'

export async function POST(req: Request) {
  const session = await getDipSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { tipo, data, dataFine, note, oraInizio, oraFine } = await req.json()
  const richiesta = await prisma.richiestaDipendente.create({
    data: {
      dipendenteId: session.dipendenteId,
      tipo,
      data: data ? new Date(data) : null,
      dataFine: dataFine ? new Date(dataFine) : null,
      note,
      oraInizio: oraInizio || null,
      oraFine: oraFine || null,
    },
  })
  return NextResponse.json({ richiesta })
}

export async function PATCH(req: Request) {
  const session = await getDipSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id, tipo, data, dataFine, note, oraInizio, oraFine } = await req.json()
  const richiesta = await prisma.richiestaDipendente.findFirst({
    where: { id, dipendenteId: session.dipendenteId },
  })
  if (!richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  if (richiesta.status !== 'in_attesa') return NextResponse.json({ error: 'Non modificabile' }, { status: 403 })

  const updated = await prisma.richiestaDipendente.update({
    where: { id },
    data: {
      tipo,
      data: data ? new Date(data) : null,
      dataFine: dataFine ? new Date(dataFine) : null,
      note,
      oraInizio: oraInizio || null,
      oraFine: oraFine || null,
    },
  })
  return NextResponse.json({ richiesta: updated })
}

export async function DELETE(req: Request) {
  const session = await getDipSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const richiestaId = searchParams.get('id')
  if (!richiestaId) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const richiesta = await prisma.richiestaDipendente.findFirst({
    where: { id: richiestaId, dipendenteId: session.dipendenteId },
  })
  if (!richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  if (richiesta.tipo !== 'preferenza_orario' && richiesta.status !== 'in_attesa')
    return NextResponse.json({ error: 'Non eliminabile' }, { status: 403 })

  await prisma.richiestaDipendente.delete({ where: { id: richiestaId } })
  return NextResponse.json({ ok: true })
}
