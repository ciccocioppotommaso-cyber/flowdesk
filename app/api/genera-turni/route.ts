import { getAuthUser } from '@/lib/getAuthUser'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { settimana, requisiti, note } = await req.json()
  if (!settimana) return NextResponse.json({ error: 'settimana obbligatoria' }, { status: 400 })

  // Carica dipendenti e le loro disponibilità per la settimana
  const dipendenti = await prisma.dipendente.findMany({
    where: { userId: user.id },
    include: {
      disponibilita: { where: { settimana: new Date(settimana) } },
      richieste: {
        where: {
          status: 'approvata',
          tipo: 'assenza',
          data: { lte: new Date(new Date(settimana).getTime() + 7 * 24 * 60 * 60 * 1000) },
          dataFine: { gte: new Date(settimana) },
        },
      },
    },
  })

  if (dipendenti.length === 0)
    return NextResponse.json({ error: 'Nessun dipendente trovato' }, { status: 400 })

  // Costruisci il contesto per Claude
  const dipendentiInfo = dipendenti.map(d => {
    const disp = d.disponibilita[0]
    const disponibilitaSlots: any[] = disp ? JSON.parse(disp.disponibilita) : []
    const assenze = d.richieste.map(r => ({
      dal: r.data?.toISOString().split('T')[0],
      al: r.dataFine?.toISOString().split('T')[0],
    }))
    return {
      id: d.id,
      nome: d.nome,
      ruolo: d.ruolo || 'generico',
      disponibilita: disponibilitaSlots.length > 0
        ? disponibilitaSlots.map(s => `${GIORNI[s.giorno]} ${s.oraInizio}–${s.oraFine}`).join(', ')
        : 'Non ha inviato disponibilità (disponibile se necessario)',
      assenze: assenze.length > 0 ? assenze.map(a => `dal ${a.dal} al ${a.al}`).join(', ') : 'nessuna',
    }
  })

  const dataLunedi = new Date(settimana)
  const giornoStr = dataLunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  const prompt = `Sei un assistente per la gestione del personale. Devi creare il piano turni per la settimana dal ${giornoStr}.

## Dipendenti disponibili:
${dipendentiInfo.map(d => `- **${d.nome}** (ruolo: ${d.ruolo})
  Disponibilità: ${d.disponibilita}
  Assenze approvate: ${d.assenze}`).join('\n')}

## Requisiti del titolare per questa settimana:
${requisiti && requisiti.length > 0
  ? requisiti.map((r: any) => `- ${GIORNI[r.giorno]}: ${r.persone} persona/e${r.ruolo ? ` con ruolo ${r.ruolo}` : ''}, fascia ${r.fascia} (${r.oraInizio}–${r.oraFine})`).join('\n')
  : 'Nessun requisito specifico — distribuisci equamente il lavoro tra i disponibili'}
${note ? `\nNote aggiuntive del titolare: ${note}` : ''}

## Istruzioni:
1. Rispetta le disponibilità dei dipendenti
2. Non assegnare turni nelle giornate di assenza approvata
3. Distribuisci i turni in modo equo
4. Se un dipendente non ha inviato disponibilità, puoi assegnarlo solo se strettamente necessario
5. Rispondi SOLO con un JSON valido, senza testo aggiuntivo, nel seguente formato:

{
  "turni": [
    {
      "dipendenteId": "id_del_dipendente",
      "nome": "Nome Dipendente",
      "giorno": 0,
      "data": "YYYY-MM-DD",
      "oraInizio": "09:00",
      "oraFine": "17:00",
      "ruolo": "ruolo specifico o null",
      "note": "eventuale nota o null"
    }
  ],
  "spiegazione": "Breve spiegazione delle scelte fatte (2-3 frasi)"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed: any
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? text)
  } catch {
    return NextResponse.json({ error: 'Errore nel parsing della risposta AI', raw: text }, { status: 500 })
  }

  // Calcola le date reali per ogni giorno
  const turniConDate = parsed.turni.map((t: any) => {
    const data = new Date(dataLunedi)
    data.setDate(data.getDate() + t.giorno)
    return { ...t, data: data.toISOString().split('T')[0] }
  })

  return NextResponse.json({ turni: turniConDate, spiegazione: parsed.spiegazione })
}
