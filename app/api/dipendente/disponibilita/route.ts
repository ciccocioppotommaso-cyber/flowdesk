import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDipSession } from '@/lib/dipendenteAuth'

export async function GET(req: Request) {
  const session = await getDipSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mese = searchParams.get('mese')
  if (!mese) return NextResponse.json({ error: 'mese obbligatorio' }, { status: 400 })

  const record = await prisma.disponibilitaDipendente.findUnique({
    where: { dipendenteId_mese: { dipendenteId: session.dipendenteId, mese: new Date(mese) } },
  })
  return NextResponse.json({ giorni: record ? JSON.parse(record.giorni as string) : [] })
}

export async function POST(req: Request) {
  const session = await getDipSession()
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { mese, giorni } = await req.json()
  const record = await prisma.disponibilitaDipendente.upsert({
    where: { dipendenteId_mese: { dipendenteId: session.dipendenteId, mese: new Date(mese) } },
    update: { giorni: JSON.stringify(giorni) },
    create: { dipendenteId: session.dipendenteId, mese: new Date(mese), giorni: JSON.stringify(giorni) },
  })
  return NextResponse.json({ ok: true, record })
}
