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
        const { shows } = await import('@/db/schema')
        const { eq } = await import('drizzle-orm')
        const { setNowPlaying, markLiveStart, clearLiveGuard, pollIcecastNowPlaying } =
          await import('@/lib/server/now-playing')

        const [show] = await db.select().from(shows).where(eq(shows.streamKey, streamKey))
        if (!show) return new Response('Unknown stream key', { status: 404 })

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
