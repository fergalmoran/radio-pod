import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'

type ShowIdInput = {
  showId: number
}

export const goLive = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as ShowIdInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows, users } = await import('@/db/schema')
    const { getRole, canSchedule, canManageAllShows } = await import('@/lib/roles')
    const { randomBytes } = await import('node:crypto')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const role = getRole(session)
    if (!canSchedule(role)) throw new Error('Forbidden')

    const [show] = await db.select().from(shows).where(eq(shows.id, data.showId))
    if (!show) throw new Error('Show not found')
    if (!canManageAllShows(role) && show.hostUserId !== session.user.id) {
      throw new Error('Forbidden: not your show')
    }

    // The stream key belongs to the host, not the show — it's generated once
    // and reused for every show they go live with.
    const hostUserId = show.hostUserId ?? session.user.id
    const [host] = await db.select().from(users).where(eq(users.id, hostUserId))
    if (!host) throw new Error('Host not found')

    const streamKey = host.streamKey ?? randomBytes(16).toString('hex')
    if (!host.streamKey) {
      await db.update(users).set({ streamKey }).where(eq(users.id, host.id))
    }

    // Arm the show so MediaMTX's publish auth webhook (/api/live/auth) will
    // accept OBS connecting with this stream key — publishing is otherwise
    // rejected, so hitting "Go Live" is required before OBS can start.
    if (show.liveStatus !== 'live') {
      await db.update(shows).set({ liveStatus: 'starting', liveArmedAt: new Date() }).where(eq(shows.id, show.id))
    }

    return {
      rtmpUrl: `${process.env.MEDIAMTX_RTMP_PUBLIC_URL ?? 'rtmp://localhost:1935'}/live`,
      streamKey,
      isLive: show.liveStatus === 'live',
    }
  })

export const endLive = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as ShowIdInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows } = await import('@/db/schema')
    const { getRole, canEndLive } = await import('@/lib/roles')
    const { clearLiveGuard, pollKaclNowPlaying } = await import('@/lib/server/now-playing')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const [show] = await db.select().from(shows).where(eq(shows.id, data.showId))
    if (!show) throw new Error('Show not found')

    const isOwner = show.hostUserId === session.user.id
    if (!canEndLive(getRole(session), isOwner)) throw new Error('Forbidden')

    await db.update(shows).set({ liveStatus: 'offline', liveArmedAt: null }).where(eq(shows.id, show.id))
    clearLiveGuard()
    await pollKaclNowPlaying()
  })

export const getShowLiveInfo = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data as ShowIdInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows, users } = await import('@/db/schema')
    const { getRole, canSchedule, canManageAllShows } = await import('@/lib/roles')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const role = getRole(session)
    if (!canSchedule(role)) throw new Error('Forbidden')

    const [show] = await db.select().from(shows).where(eq(shows.id, data.showId))
    if (!show) throw new Error('Show not found')
    if (!canManageAllShows(role) && show.hostUserId !== session.user.id) {
      throw new Error('Forbidden: not your show')
    }

    const hostUserId = show.hostUserId ?? session.user.id
    const [host] = await db.select().from(users).where(eq(users.id, hostUserId))

    return {
      streamKey: host?.streamKey ?? null,
      liveStatus: show.liveStatus,
      rtmpUrl: `${process.env.MEDIAMTX_RTMP_PUBLIC_URL ?? 'rtmp://localhost:1935'}/live`,
    }
  })
