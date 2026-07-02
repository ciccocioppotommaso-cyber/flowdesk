import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Chiamata ogni giorno alle 04:00 dalla cron Vercel
// Protetta dal CRON_SECRET in produzione
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const ora = new Date()
  let appAggiornati = 0
  let leadCancellati = 0
  let convEliminate = 0

  // 1. Segna come "completato" tutti gli appuntamenti confermati con data passata
  const risultato = await prisma.appuntamento.updateMany({
    where: { status: 'confermato', data: { lt: ora } },
    data: { status: 'completato' },
  })
  appAggiornati = risultato.count

  // 2. Trova lead da archiviare: hanno preventivi tutti "accettati/rifiutati/completati"
  //    e nessun appuntamento futuro confermato, e non sono già cancellati
  const leadAttivi = await prisma.lead.findMany({
    where: { cancellato: false },
    select: {
      id: true,
      email: true,
      preventivi: { select: { status: true } },
      appuntamenti: { select: { data: true, status: true } },
    },
  })

  const leadDaArchiviare: string[] = []

  for (const lead of leadAttivi) {
    // Salta se non ha né preventivi né appuntamenti (contatto manuale ancora in lavorazione)
    if (lead.preventivi.length === 0 && lead.appuntamenti.length === 0) continue

    // Controlla se ci sono appuntamenti futuri confermati
    const haAppFuturo = lead.appuntamenti.some(
      a => new Date(a.data) > ora && (a.status === 'confermato')
    )
    if (haAppFuturo) continue

    // Controlla se ci sono preventivi ancora in lavorazione (da_verificare o inviato)
    const haPreventivoPendente = lead.preventivi.some(
      p => p.status === 'da_verificare' || p.status === 'inviato'
    )
    if (haPreventivoPendente) continue

    // Tutti gli appuntamenti sono passati e nessun preventivo pendente → archivia
    const haAppPassati = lead.appuntamenti.some(
      a => new Date(a.data) < ora && (a.status === 'completato' || a.status === 'no_show')
    )
    const haPrevantivoChiuso = lead.preventivi.some(
      p => p.status === 'accettato' || p.status === 'rifiutato' || p.status === 'completato'
    )

    if (haAppPassati || haPrevantivoChiuso) {
      leadDaArchiviare.push(lead.id)
    }
  }

  if (leadDaArchiviare.length > 0) {
    // Soft-delete dei lead
    await prisma.lead.updateMany({
      where: { id: { in: leadDaArchiviare } },
      data: { cancellato: true },
    })
    leadCancellati = leadDaArchiviare.length

    // Elimina le conversazioni dei lead archiviati
    const emailDaEliminare = leadAttivi
      .filter(l => leadDaArchiviare.includes(l.id) && l.email)
      .map(l => l.email!)

    if (emailDaEliminare.length > 0) {
      const delRes = await prisma.conversazione.deleteMany({
        where: { clienteEmail: { in: emailDaEliminare } },
      })
      convEliminate = delRes.count
    }
  }

  return NextResponse.json({
    ok: true,
    appuntamentiCompletati: appAggiornati,
    leadArchiviati: leadCancellati,
    conversazioniEliminate: convEliminate,
    eseguitoAlle: ora.toISOString(),
  })
}
