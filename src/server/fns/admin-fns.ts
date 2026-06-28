import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { asc, eq } from 'drizzle-orm'
import type { UserRole } from '@/db/schema'

type UpdateRoleInput = {
  userId: string
  role: UserRole
}

async function requireAdmin() {
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({ headers: await getRequestHeaders() })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || role !== 'admin') throw new Error('Unauthorized')
}

export const getAdminUsers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { db } = await import('@/db')
  const { users } = await import('@/db/schema')
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.name))
})

export const updateUserRole = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as UpdateRoleInput)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { db } = await import('@/db')
    const { users } = await import('@/db/schema')
    await db.update(users).set({ role: data.role }).where(eq(users.id, data.userId))
  })
