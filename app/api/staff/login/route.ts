import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmailStaff } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })

  const dipendente = await prisma.dipendente.findFirst({ where: { email } })
  if (!dipendente) return NextResponse.json({ error: 'Email non trovata' }, { status: 404 })

  const token = crypto.randomBytes(32).toString('hex')
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 ore

  await prisma.dipendente.update({ where: { id: dipendente.id }, data: { token, tokenExpiry } })

  const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/${token}`
  await sendEmailStaff(email, dipendente.nome, link)

  return NextResponse.json({ ok: true })
}
