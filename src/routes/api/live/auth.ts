import { createFileRoute } from '@tanstack/react-router'

// MediaMTX's publish auth webhook (authHTTPAddress) — called before allowing
// an RTMP publish. Only a show armed via "Go Live" (goLive sets
// liveStatus="starting" + liveArmedAt) may publish, and only within a short
// window of that — prevents OBS from starting a stream at any time just
// because it still has a valid stream key from a past broadcast.
const ARM_WINDOW_MS = 10 * 60 * 1000

type MediaMtxAuthRequest = {
  action: string
  path: string
}

export const Route = createFileRoute('/api/live/auth')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url)
        const secret = url.searchParams.get('secret')
        if (!secret || secret !== process.env.MEDIAMTX_WEBHOOK_SECRET) {
          return new Response('Unauthorized', { status: 401 })
        }

        const body = (await request.json()) as MediaMtxAuthRequest
        // Reads/playback/api/etc. are excluded from HTTP auth in mediamtx.yml —
        // this is just defense in depth in case that ever changes.
        if (body.action !== 'publish') {
          return new Response('ok')
        }

        const streamKey = body.path.split('/').pop()
        if (!streamKey) return new Response('Bad path', { status: 400 })

        const { db } = await import('@/db')
        const { shows } = await import('@/db/schema')
        const { eq } = await import('drizzle-orm')

        const [show] = await db.select().from(shows).where(eq(shows.streamKey, streamKey))
        if (!show) return new Response('Unknown stream key', { status: 401 })

        const armedRecently =
          show.liveStatus === 'starting' &&
          show.liveArmedAt != null &&
          Date.now() - show.liveArmedAt.getTime() < ARM_WINDOW_MS

        if (!armedRecently) return new Response('Not armed — click Go Live first', { status: 401 })

        return new Response('ok')
      },
    },
  },
})
