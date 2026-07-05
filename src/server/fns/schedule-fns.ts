import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, gte, gt, lt, asc, eq } from 'drizzle-orm'
import { scheduleShow, cancelShow, stopCurrentShow } from '@/lib/server/scheduler'

type GetShowsInput = {
  month: string // "YYYY-MM"
}

type CreateShowInput = {
  title: string
  description?: string
  broadcastAt: string
  durationMinutes?: number
  imageUrl?: string
  audioUrl?: string
}

type UpdateShowInput = CreateShowInput & { id: number }

export const getShowsForMonth = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data as GetShowsInput)
  .handler(async ({ data }) => {
    const { db } = await import('@/db')
    const { shows } = await import('@/db/schema')

    const [year, month] = data.month.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)

    return db
      .select({
        id: shows.id,
        title: shows.title,
        description: shows.description,
        audioUrl: shows.audioUrl,
        imageUrl: shows.imageUrl,
        broadcastAt: shows.broadcastAt,
        durationSeconds: shows.durationSeconds,
        hostName: shows.hostName,
        hostUserId: shows.hostUserId,
      })
      .from(shows)
      .where(and(gte(shows.broadcastAt, start), lt(shows.broadcastAt, end)))
      .orderBy(asc(shows.broadcastAt))
  })

export const createShow = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as CreateShowInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows } = await import('@/db/schema')
    const { getRole, canSchedule } = await import('@/lib/roles')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')
    if (!canSchedule(getRole(session))) throw new Error('Forbidden')

    const [show] = await db
      .insert(shows)
      .values({
        title: data.title,
        description: data.description,
        broadcastAt: new Date(data.broadcastAt),
        durationSeconds: data.durationMinutes ? data.durationMinutes * 60 : null,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        hostName: session.user.name,
        hostUserId: session.user.id,
      })
      .returning()

    scheduleShow(show)

    return show
  })

export const updateShow = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as UpdateShowInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows } = await import('@/db/schema')
    const { getRole, canSchedule, canManageAllShows } = await import('@/lib/roles')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const role = getRole(session)
    if (!canSchedule(role)) throw new Error('Forbidden')

    const [existing] = await db.select().from(shows).where(eq(shows.id, data.id))
    if (!existing) throw new Error('Show not found')
    if (!canManageAllShows(role) && existing.hostUserId !== session.user.id) {
      throw new Error('Forbidden: not your show')
    }

    const [show] = await db
      .update(shows)
      .set({
        title: data.title,
        description: data.description,
        broadcastAt: new Date(data.broadcastAt),
        durationSeconds: data.durationMinutes ? data.durationMinutes * 60 : null,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
      })
      .where(eq(shows.id, data.id))
      .returning()

    scheduleShow(show)

    return show
  })

export const getUpNext = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { shows } = await import('@/db/schema')

  const [row] = await db
    .select({
      id: shows.id,
      title: shows.title,
      imageUrl: shows.imageUrl,
      broadcastAt: shows.broadcastAt,
      durationSeconds: shows.durationSeconds,
      hostName: shows.hostName,
    })
    .from(shows)
    .where(gt(shows.broadcastAt, new Date()))
    .orderBy(asc(shows.broadcastAt))
    .limit(1)

  return row ?? null
})

export const deleteShow = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as { id: number })
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows } = await import('@/db/schema')
    const { getRole, canSchedule, canManageAllShows } = await import('@/lib/roles')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const role = getRole(session)
    if (!canSchedule(role)) throw new Error('Forbidden')

    const [existing] = await db.select().from(shows).where(eq(shows.id, data.id))
    if (!existing) return
    if (!canManageAllShows(role) && existing.hostUserId !== session.user.id) {
      throw new Error('Forbidden: not your show')
    }

    cancelShow(data.id)
    await db.delete(shows).where(eq(shows.id, data.id))
  })

export const stopShow = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const { getRole } = await import('@/lib/roles')

  const session = await auth.api.getSession({ headers: await getRequestHeaders() })
  if (!session || getRole(session) !== 'admin') throw new Error('Unauthorized')

  await stopCurrentShow()
})
