import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'

export async function getAuthUserId(): Promise<string | null> {
  try {
    const { userId } = await auth()
    return userId ?? null
  } catch {
    return null
  }
}

export async function getAuthUser() {
  const userId = await getAuthUserId()
  if (!userId) return null
  // Percorso veloce: una semplice lettura per l'utente (già esistente nel 99% dei casi).
  // L'upsert (scrittura, ~5x più lento) si fa SOLO al primissimo accesso, quando manca.
  const existing = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (existing) return existing
  return prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId },
  })
}
