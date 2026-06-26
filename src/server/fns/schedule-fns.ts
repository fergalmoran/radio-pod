import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, gte, lt, asc, eq } from 'drizzle-orm'

type GetEpisodesInput = {
  month: string // "YYYY-MM"
}

type CreateEpisodeInput = {
  title: string
  description?: string
  showId?: number | null
  broadcastAt: string // ISO datetime string
  durationMinutes?: number
  imageUrl?: string
}

export const getEpisodesForMonth = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data as GetEpisodesInput)
  .handler(async ({ data }) => {
    const { db } = await import('#/db')
    const { episodes, shows } = await import('#/db/schema')

    const [year, month] = data.month.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)

    const rows = await db
      .select({
        id: episodes.id,
        title: episodes.title,
        description: episodes.description,
        broadcastAt: episodes.broadcastAt,
        durationSeconds: episodes.durationSeconds,
        imageUrl: episodes.imageUrl,
        showId: episodes.showId,
        showTitle: shows.title,
      })
      .from(episodes)
      .leftJoin(shows, eq(shows.id, episodes.showId))
      .where(and(gte(episodes.broadcastAt, start), lt(episodes.broadcastAt, end)))
      .orderBy(asc(episodes.broadcastAt))

    return rows
  })

export const createEpisode = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as CreateEpisodeInput)
  .handler(async ({ data }) => {
    const { auth } = await import('#/lib/auth')
    const { db } = await import('#/db')
    const { episodes, shows } = await import('#/db/schema')
    const { getRole, canSchedule, canManageAllShows } = await import('#/lib/roles')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const role = getRole(session)
    if (!canSchedule(role)) throw new Error('Forbidden')

    // dh: verify the show belongs to them if one is specified
    if (data.showId && !canManageAllShows(role)) {
      const [show] = await db.select().from(shows).where(eq(shows.id, data.showId))
      if (!show || show.hostUserId !== session.user.id) {
        throw new Error('Forbidden: not your show')
      }
    }

    const [episode] = await db
      .insert(episodes)
      .values({
        title: data.title,
        description: data.description,
        showId: data.showId ?? null,
        broadcastAt: new Date(data.broadcastAt),
        durationSeconds: data.durationMinutes ? data.durationMinutes * 60 : null,
        imageUrl: data.imageUrl,
      })
      .returning()

    return episode
  })
