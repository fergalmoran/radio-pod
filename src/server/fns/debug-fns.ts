import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { gt, ne, asc } from 'drizzle-orm'

export const getNowPlayingDebugInfo = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const { getRole } = await import('@/lib/roles')
  const { db } = await import('@/db')
  const { shows } = await import('@/db/schema')
  const {
    getNowPlaying,
    getNowPlayingDebug,
    isEpisodeExpected,
    getEpisodeEndsAt,
    isLiveActive,
  } = await import('@/lib/server/now-playing')
  const { kaclUrl, controlHeaders } = await import('@/lib/server/kacl-client')

  const session = await auth.api.getSession({ headers: await getRequestHeaders() })
  if (!session || getRole(session) !== 'admin') throw new Error('Unauthorized')

  const now = new Date()
  const { reason, setAt } = getNowPlayingDebug()

  // What kacl actually has scheduled — the real source of truth now, so
  // more useful here than the app's own belief about it.
  const kaclShows = await fetch(`${kaclUrl()}/shows`, { headers: controlHeaders() })
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => []) as Array<{
      id: string
      name: string
      oneOffStartUtc: string | null
      oneOffEndUtc: string | null
      enabled: boolean
    }>

  const [upcomingShows, liveOrArmedShows] = await Promise.all([
    db
      .select({
        id: shows.id,
        title: shows.title,
        broadcastAt: shows.broadcastAt,
        durationSeconds: shows.durationSeconds,
        audioUrl: shows.audioUrl,
      })
      .from(shows)
      .where(gt(shows.broadcastAt, now))
      .orderBy(asc(shows.broadcastAt))
      .limit(10),
    db
      .select({
        id: shows.id,
        title: shows.title,
        liveStatus: shows.liveStatus,
        liveArmedAt: shows.liveArmedAt,
        liveStartedAt: shows.liveStartedAt,
        hostName: shows.hostName,
      })
      .from(shows)
      .where(ne(shows.liveStatus, 'offline')),
  ])

  return {
    serverTime: now.toISOString(),
    nowPlaying: getNowPlaying(),
    reason,
    setAt: setAt || null,
    guards: {
      isEpisodeExpected: isEpisodeExpected(),
      episodeEndsAt: getEpisodeEndsAt() || null,
      isLiveActive: isLiveActive(),
    },
    kaclShows,
    upcomingShows,
    liveOrArmedShows,
  }
})
