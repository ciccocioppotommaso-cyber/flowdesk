import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

// DELETE — rimuove una riga da un ordine e ricalcola il totale
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params
  const { rigaId } = await req.json()
  if (!rigaId) return NextResponse.json({ error: 'rigaId richiesto' }, { status: 400 })

  await prisma.rigaOrdine.delete({ where: { id: rigaId } })

  // Ricalcola totale
  const righe = await prisma.rigaOrdine.findMany({ where: { ordineId: id } })
  const totale = righe.reduce((s, r) => s + r.prezzo * r.quantita, 0)
  const ordine = await prisma.ordine.update({ where: { id }, data: { totale } })

  return NextResponse.json({ ordine })
}

// PATCH — modifica quantità di una riga
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await params
  const { rigaId, quantita } = await req.json()
  if (!rigaId || quantita == null) return NextResponse.json({ error: 'rigaId e quantita richiesti' }, { status: 400 })

  if (quantita <= 0) {
    await prisma.rigaOrdine.delete({ where: { id: rigaId } })
  } else {
    await prisma.rigaOrdine.update({ where: { id: rigaId }, data: { quantita } })
  }

  const righe = await prisma.rigaOrdine.findMany({ where: { ordineId: id } })
  const totale = righe.reduce((s, r) => s + r.prezzo * r.quantita, 0)
  const ordine = await prisma.ordine.update({ where: { id }, data: { totale } })

  return NextResponse.json({ ordine })
}
