import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const data = await req.json()
  const categoria = await prisma.menuCategoria.update({ where: { id: params.id }, data })
  return NextResponse.json({ categoria })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  await prisma.menuPiatto.deleteMany({ where: { categoriaId: params.id } })
  await prisma.menuCategoria.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
