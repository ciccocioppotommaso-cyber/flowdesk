import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params
  const data = await req.json()
  await prisma.sala.updateMany({ where: { id, userId: user.id }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params
  // Sposta i tavoli di questa sala alla prima altra sala disponibile
  const altra = await prisma.sala.findFirst({ where: { userId: user.id, NOT: { id } }, orderBy: { ordine: 'asc' } })
  if (altra) await prisma.tavolo.updateMany({ where: { userId: user.id, salaId: id }, data: { salaId: altra.id } })
  await prisma.sala.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}
