import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, eq, desc, isNotNull, lt } from 'drizzle-orm'

export const getShows = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { shows } = await import('@/db/schema')

  const rows = await db
    .select({
      id: shows.id,
      title: shows.title,
      description: shows.description,
      hostName: shows.hostName,
      hostUserId: shows.hostUserId,
      imageUrl: shows.imageUrl,
      audioUrl: shows.audioUrl,
      broadcastAt: shows.broadcastAt,
    })
    .from(shows)
    .orderBy(desc(shows.broadcastAt))

  // Recurring shows are multiple rows sharing a title — collapse to one card
  // per title for the browse listing, keeping the most recent occurrence's
  // details as representative.
  const byTitle = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (!byTitle.has(row.title)) byTitle.set(row.title, row)
  }
  return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title))
})

// A show is "listen-back-able" once it's aired (broadcastAt in the past) and
// has an archived recording (audioUrl) — audioUrl alone isn't enough since
// hosts can upload a pre-recorded episode ahead of its scheduled broadcast.
export const getFinishedShows = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { shows } = await import('@/db/schema')

  return db
    .select({
      id: shows.id,
      title: shows.title,
      description: shows.description,
      hostName: shows.hostName,
      hostUserId: shows.hostUserId,
      imageUrl: shows.imageUrl,
      audioUrl: shows.audioUrl,
      broadcastAt: shows.broadcastAt,
      durationSeconds: shows.durationSeconds,
    })
    .from(shows)
    .where(and(isNotNull(shows.audioUrl), lt(shows.broadcastAt, new Date())))
    .orderBy(desc(shows.broadcastAt))
})

export const getShowsForUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const { db } = await import('@/db')
  const { shows } = await import('@/db/schema')
  const { getRole, canManageAllShows } = await import('@/lib/roles')

  const session = await auth.api.getSession({ headers: await getRequestHeaders() })
  if (!session) return [] as never[]

  const role = getRole(session)

  const cols = {
    id: shows.id,
    title: shows.title,
    description: shows.description,
    hostName: shows.hostName,
    hostUserId: shows.hostUserId,
    imageUrl: shows.imageUrl,
    broadcastAt: shows.broadcastAt,
    liveStatus: shows.liveStatus,
  }

  if (canManageAllShows(role)) {
    return db.select(cols).from(shows).orderBy(desc(shows.broadcastAt))
  }

  return db.select(cols).from(shows).where(eq(shows.hostUserId, session.user.id)).orderBy(desc(shows.broadcastAt))
})
