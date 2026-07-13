import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/getAuthUser'

// POST — chiude il conto aperto per un tavolo/gruppo e scioglie la fusione
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { tavoloId, gruppoId } = await req.json()
  if (!tavoloId && !gruppoId) return NextResponse.json({ error: 'tavoloId o gruppoId richiesti' }, { status: 400 })

  // Chiude tutti i conti aperti per questo tavolo/gruppo
  const where = gruppoId
    ? { userId: user.id, gruppoId, status: { notIn: ['chiuso'] } }
    : { userId: user.id, tavoloId, gruppoId: null, status: { notIn: ['chiuso'] } }

  await prisma.ordine.updateMany({ where, data: { status: 'chiuso' } })

  // Segna come "confermato" gli appuntamenti attivi del tavolo (libera il tavolo in calendario)
  const statiAttivi = ['in_attesa', 'confermato', 'pronto']
  if (tavoloId) {
    await prisma.appuntamento.updateMany({
      where: { userId: user.id, tavoloId, status: { in: statiAttivi } },
      data: { status: 'confermato' },
    })
  }
  if (gruppoId) {
    const gruppo = await prisma.gruppoTavoli.findUnique({
      where: { id: gruppoId },
      include: { tavoli: { select: { id: true } } },
    })
    if (gruppo) {
      const tavoloIds = gruppo.tavoli.map(t => t.id)
      await prisma.appuntamento.updateMany({
        where: { userId: user.id, tavoloId: { in: tavoloIds }, status: { in: statiAttivi } },
        data: { status: 'confermato' },
      })
    }
    await prisma.gruppoTavoli.deleteMany({ where: { id: gruppoId, userId: user.id } })
  }

  return NextResponse.json({ ok: true })
}
