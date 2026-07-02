import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmailConferma, sendEmailRifiuto } from '@/lib/email'

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { azione } = await req.json()

  const preventivo = await prisma.preventivo.findUnique({ where: { tokenRisposta: token } })
  if (!preventivo) return NextResponse.json({ error: 'Link non valido o già utilizzato' }, { status: 404 })
  if (preventivo.status !== 'inviato') return NextResponse.json({ error: 'Questo link è già stato utilizzato' }, { status: 409 })

  const user = await prisma.user.findUnique({ where: { id: preventivo.userId } })
  if (!user) return NextResponse.json({ error: 'Errore interno' }, { status: 500 })

  if (azione === 'accetta') {
    // Fix 3: aggiorna sia preventivo che lead ad "accettato/chiuso"
    await prisma.preventivo.update({
      where: { id: preventivo.id },
      data: { status: 'accettato', tokenRisposta: null },
    })
    if (preventivo.leadId) {
      await prisma.lead.updateMany({
        where: { id: preventivo.leadId, userId: user.id },
        data: { status: 'chiuso', cancellato: false },
      })
    }

    // Fix 2: email di conferma con i dati aggiornati dalla proposta
    if (preventivo.clienteEmail) {
      const items = JSON.parse(preventivo.items ?? '[]') as Array<{ descrizione?: string; coperti?: number; allergie?: string; occasione?: string }>
      const note = preventivo.note ?? ''
      const dataMatch = note.match(/DATA_ISO:(\d{4}-\d{2}-\d{2})/)
      const oraMatch = note.match(/ORA_ISO:(\d{2}:\d{2})/)
      const copertiNote = note.match(/Coperti:\s*(\d+)/)
      const allergieNote = note.match(/Allergie:\s*([^.]+)/)
      const occasioneNote = note.match(/Occasione:\s*([^.]+)/)

      await sendEmailConferma({
        clienteEmail: preventivo.clienteEmail,
        clienteNome: preventivo.clienteName,
        nomeLocale: user.nomeLocale ?? 'Il locale',
        tipo: preventivo.tipo,
        // Questi dati riflettono le modifiche salvate nella proposta
        data: dataMatch?.[1],
        ora: oraMatch?.[1],
        coperti: items[0]?.coperti ?? (copertiNote ? parseInt(copertiNote[1]) : undefined),
        allergie: items[0]?.allergie ?? allergieNote?.[1]?.trim(),
        occasione: items[0]?.occasione ?? occasioneNote?.[1]?.trim(),
        servizio: items[0]?.descrizione,
        messaggioProposta: preventivo.messaggioProposta ?? undefined,
      })
    }
    return NextResponse.json({ ok: true, azione: 'accettato' })
  }

  if (azione === 'rifiuta') {
    await prisma.preventivo.update({
      where: { id: preventivo.id },
      data: { status: 'rifiutato', tokenRisposta: null },
    })
    if (preventivo.leadId) {
      await prisma.lead.updateMany({
        where: { id: preventivo.leadId, userId: user.id },
        data: { cancellato: true },
      })
    }
    if (preventivo.clienteEmail) {
      await sendEmailRifiuto({
        clienteEmail: preventivo.clienteEmail,
        clienteNome: preventivo.clienteName,
        nomeLocale: user.nomeLocale ?? 'Il locale',
        tipo: preventivo.tipo,
      })
    }
    return NextResponse.json({ ok: true, azione: 'rifiutato' })
  }

  return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
}
