import { getAuthUser } from '@/lib/getAuthUser'
import { NextResponse } from 'next/server'
import { generateQrToken } from '@/lib/timbratureToken'

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const token = generateQrToken(user.id)
  return NextResponse.json({ token })
}
