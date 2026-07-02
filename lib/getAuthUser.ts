import { prisma } from './prisma'

export async function getAuthUserId(request?: Request): Promise<string | null> {
  if (!request) return null
  const cookieHeader = request.headers.get('cookie') ?? ''

  // Prova __session (cookie breve, presente se il middleware ha funzionato)
  const sessionJwt = cookieHeader.match(/__session=([^;]+)/)?.[1]
  if (sessionJwt) {
    try {
      const payload = JSON.parse(Buffer.from(sessionJwt.split('.')[1], 'base64url').toString())
      if (payload.sub) return payload.sub
    } catch { /* ignora */ }
  }

  // Fallback: decodifica __clerk_db_jwt (presente sempre in dev)
  const dbJwt = cookieHeader.match(/__clerk_db_jwt[^=]*=([^;]+)/)?.[1]
  if (dbJwt) {
    try {
      const payload = JSON.parse(Buffer.from(dbJwt.split('.')[1], 'base64url').toString())
      if (payload.sub) return payload.sub
    } catch { /* ignora */ }
  }

  return null
}

export async function getAuthUser(request?: Request) {
  const userId = await getAuthUserId(request)
  if (!userId) return null
  return prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId },
  })
}
