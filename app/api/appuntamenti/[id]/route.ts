import { getAuthUser, getAuthUserId } from '@/lib/getAuthUser'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params
  const data = await req.json()
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Controlla conflitto tavolo
  if (data.tavoloId) {
    const corrente = await prisma.appuntamento.findFirst({ where: { id, userId: user.id } })
    if (corrente) {
      const inizioNuovo = corrente.data
      const fineNuovo = new Date(corrente.data.getTime() + corrente.durata * 60000)
      const conflitto = await prisma.appuntamento.findFirst({
        where: {
          userId: user.id,
          tavoloId: data.tavoloId,
          id: { not: id },
          status: { notIn: ['cancellato'] },
          data: { lt: fineNuovo },
        },
      })
      if (conflitto) {
        const fineConflitto = new Date(conflitto.data.getTime() + conflitto.durata * 60000)
        if (fineConflitto > inizioNuovo) {
          return NextResponse.json({ error: 'Tavolo già occupato in questo orario', conflitto: true }, { status: 409 })
        }
      }
    }
  }

  await prisma.appuntamento.updateMany({ where: { id, userId: user.id }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  await prisma.appuntamento.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}
