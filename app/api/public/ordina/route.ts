import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { publicId, tipo, nome, cognome, email, telefono, data, ora, indirizzo, righe, noteCliente } = await req.json()

  if (!publicId || !email || !nome || !data || !ora || !righe?.length) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { publicId } })
  if (!user) return NextResponse.json({ error: 'Locale non trovato' }, { status: 404 })

  const isDelivery = tipo === 'delivery'

  if (isDelivery && user.blockDelivery) {
    return NextResponse.json({ error: 'Il servizio delivery non è al momento disponibile.' }, { status: 503 })
  }
  if (!isDelivery && user.blockAsporto) {
    return NextResponse.json({ error: 'Il servizio asporto non è al momento disponibile.' }, { status: 503 })
  }

  const nomeCompleto = [nome, cognome].filter(Boolean).join(' ')
  const totale = righe.reduce((s: number, r: { prezzo: number; quantita: number }) => s + r.prezzo * r.quantita, 0)

  const clienteInfo = JSON.stringify({
    nome: nomeCompleto,
    email,
    telefono: telefono || null,
    indirizzo: isDelivery ? (indirizzo || null) : null,
    data,
    ora,
  })

  // Trova o crea i piatti — le righe dal menu pubblico hanno già piattoId
  const ordine = await prisma.ordine.create({
    data: {
      userId: user.id,
      tavolo: isDelivery ? 'Delivery' : 'Asporto',
      tipo: isDelivery ? 'delivery' : 'asporto',
      clienteInfo,
      totale,
      note: noteCliente || null,
      status: 'nuovo',
      righe: {
        create: righe.map((r: { piattoId: string; nome: string; prezzo: number; quantita: number }) => ({
          piattoId: r.piattoId,
          nome: r.nome,
          prezzo: r.prezzo,
          quantita: r.quantita,
        })),
      },
    },
  })

  return NextResponse.json({ ok: true, ordineId: ordine.id })
}
