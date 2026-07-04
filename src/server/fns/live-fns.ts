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
    const { shows } = await import('@/db/schema')
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

    const streamKey = show.streamKey ?? randomBytes(16).toString('hex')
    if (!show.streamKey) {
      await db.update(shows).set({ streamKey }).where(eq(shows.id, show.id))
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
    const { clearLiveGuard, pollIcecastNowPlaying } = await import('@/lib/server/now-playing')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const [show] = await db.select().from(shows).where(eq(shows.id, data.showId))
    if (!show) throw new Error('Show not found')

    const isOwner = show.hostUserId === session.user.id
    if (!canEndLive(getRole(session), isOwner)) throw new Error('Forbidden')

    await db.update(shows).set({ liveStatus: 'offline' }).where(eq(shows.id, show.id))
    clearLiveGuard()
    await pollIcecastNowPlaying()
  })

export const getShowLiveInfo = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data as ShowIdInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows } = await import('@/db/schema')
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

    return {
      streamKey: show.streamKey,
      liveStatus: show.liveStatus,
      rtmpUrl: `${process.env.MEDIAMTX_RTMP_PUBLIC_URL ?? 'rtmp://localhost:1935'}/live`,
    }
  })
