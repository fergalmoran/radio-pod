import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/live/webhook')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const secret = url.searchParams.get('secret')
        if (!secret || secret !== process.env.MEDIAMTX_WEBHOOK_SECRET) {
          return new Response('Unauthorized', { status: 401 })
        }

        const event = url.searchParams.get('event')
        const path = url.searchParams.get('path') ?? ''
        const streamKey = path.split('/').pop()
        if (!streamKey) return new Response('Bad path', { status: 400 })

        const { db } = await import('@/db')
        const { shows, users } = await import('@/db/schema')
        const { eq, and, desc } = await import('drizzle-orm')
        const { setNowPlaying, markLiveStart, clearLiveGuard, pollIcecastNowPlaying } =
          await import('@/lib/server/now-playing')

        const [host] = await db.select().from(users).where(eq(users.streamKey, streamKey))
        if (!host) return new Response('Unknown stream key', { status: 404 })

        // The key identifies the host, not a specific show — resolve the show
        // that's currently starting (for "ready") or live (for "notready").
        const [show] = await db
          .select()
          .from(shows)
          .where(
            and(
              eq(shows.hostUserId, host.id),
              eq(shows.liveStatus, event === 'ready' ? 'starting' : 'live'),
            ),
          )
          .orderBy(desc(event === 'ready' ? shows.liveArmedAt : shows.liveStartedAt))
          .limit(1)
        if (!show) return new Response('No matching show for this key', { status: 404 })

        if (event === 'ready') {
          const startedAt = Date.now()
          await db
            .update(shows)
            .set({ liveStatus: 'live', liveStartedAt: new Date(startedAt), liveArmedAt: null })
            .where(eq(shows.id, show.id))

          markLiveStart()
          setNowPlaying(
            {
              type: 'live',
              title: show.title,
              artist: show.hostName ?? 'Live',
              imageUrl: show.imageUrl ?? undefined,
              showId: show.id,
              hostUserId: show.hostUserId ?? undefined,
              hlsUrl: `${process.env.MEDIAMTX_HLS_PUBLIC_URL}/live/${streamKey}/index.m3u8`,
              startedAt,
            },
            `MediaMTX webhook: OBS started publishing for show "${show.title}" (id ${show.id}, streamKey ${streamKey})`,
          )
        } else if (event === 'notready') {
          await db.update(shows).set({ liveStatus: 'offline', liveArmedAt: null }).where(eq(shows.id, show.id))
          clearLiveGuard()
          await pollIcecastNowPlaying()
        } else {
          return new Response('Unknown event', { status: 400 })
        }

        return new Response('ok')
      },
    },
  },
})
