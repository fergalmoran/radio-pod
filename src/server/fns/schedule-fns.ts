import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, gte, gt, lt, asc, eq } from 'drizzle-orm'
import { scheduleShow, cancelShow, stopCurrentShow } from '@/lib/server/scheduler'
import { materializeSeries, deleteSeriesFrom } from '@/lib/server/series'
import { generateOccurrenceDates } from '@/lib/server/recurrence'
import { findOverlapConflict } from '@/lib/server/overlap'
import type { ShowRecurrence } from '@/db/schema'

const formatDateTime = (date: Date) =>
  date.toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })

const formatConflictError = (conflict: { show: { title: string }; candidateStart: Date }) =>
  `The ${formatDateTime(conflict.candidateStart)} occurrence overlaps with "${conflict.show.title}"`

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
  recurrence?: ShowRecurrence
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
        recurrence: shows.recurrence,
        seriesId: shows.seriesId,
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
    const role = getRole(session)
    if (!canSchedule(role)) throw new Error('Forbidden')

    const recurrence = data.recurrence ?? 'once'
    const broadcastAt = new Date(data.broadcastAt)
    const durationSeconds = data.durationMinutes ? data.durationMinutes * 60 : null

    const conflict = await findOverlapConflict(
      generateOccurrenceDates(broadcastAt, recurrence).map((start) => ({ start, durationSeconds })),
    )
    if (conflict && !(role === 'admin' && recurrence === 'once')) {
      throw new Error(formatConflictError(conflict))
    }

    const [show] = await db
      .insert(shows)
      .values({
        title: data.title,
        description: data.description,
        broadcastAt,
        durationSeconds,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        hostName: session.user.name,
        hostUserId: session.user.id,
        recurrence,
      })
      .returning()

    scheduleShow(show)

    if (show.recurrence !== 'once') {
      const [rooted] = await db
        .update(shows)
        .set({ seriesId: show.id })
        .where(eq(shows.id, show.id))
        .returning()
      await materializeSeries(show.id)
      return rooted
    }

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

    const newBroadcastAt = new Date(data.broadcastAt)
    const newRecurrence = data.recurrence ?? 'once'
    const effectiveSeriesId = existing.seriesId ?? (newRecurrence !== 'once' ? existing.id : null)
    const durationSeconds = data.durationMinutes ? data.durationMinutes * 60 : null

    const conflict = await findOverlapConflict(
      generateOccurrenceDates(newBroadcastAt, newRecurrence).map((start) => ({ start, durationSeconds })),
      { excludeShowId: data.id, excludeSeriesId: effectiveSeriesId },
    )
    if (conflict && !(role === 'admin' && newRecurrence === 'once')) {
      throw new Error(formatConflictError(conflict))
    }

    // Whole-series edit: clear out the rest of the future series before
    // regenerating it below, so a cadence/time change doesn't leave stale
    // occurrences sitting alongside the freshly materialized ones.
    if (effectiveSeriesId !== null) {
      await deleteSeriesFrom(effectiveSeriesId, newBroadcastAt, data.id)
    }

    const [show] = await db
      .update(shows)
      .set({
        title: data.title,
        description: data.description,
        broadcastAt: newBroadcastAt,
        durationSeconds,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        recurrence: newRecurrence,
        seriesId: effectiveSeriesId,
      })
      .where(eq(shows.id, data.id))
      .returning()

    scheduleShow(show)

    if (effectiveSeriesId !== null) {
      await materializeSeries(effectiveSeriesId)
    }

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

    if (existing.seriesId !== null) {
      // Delete this occurrence and every future one in the series; earlier
      // (already-aired) occurrences stay in place for Listen Back.
      await deleteSeriesFrom(existing.seriesId, existing.broadcastAt)
      return
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
