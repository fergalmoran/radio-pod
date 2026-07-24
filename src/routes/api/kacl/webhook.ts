import { createFileRoute } from '@tanstack/react-router'
import { verifyKaclSignature } from '@/lib/server/kacl-client'
import { setNowPlaying, markEpisodeStart, clearEpisodeGuard, isEpisodeExpected, isLiveActive, pollKaclNowPlaying } from '@/lib/server/now-playing'
import { getSiteSettings } from '@/lib/server/site-settings'

type KaclEventEnvelope<T> = {
  id: string
  type: string
  occurredAt: string
  version: number
  payload: T
}

type PlayoutTrackStartedPayload = {
  sessionId: string | null
  showId: string | null
  source: string
  title: string
  artist: string | null
  imageUrl: string | null
  trackPath: string
  startedAtUtc: string
  durationSeconds: number
}

type PlayoutSessionPayload = {
  sessionId: string
  showId: string | null
  source: string
  title: string
  artist: string | null
  imageUrl: string | null
  sourcePath: string
  startsAtUtc?: string
  endsAtUtc?: string
  reason?: string
  stoppedAtUtc?: string
}

export const Route = createFileRoute('/api/kacl/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text()
        const signature = request.headers.get('X-KACL-Signature')
        if (!verifyKaclSignature(rawBody, signature)) {
          return new Response('Unauthorized', { status: 401 })
        }

        const event = JSON.parse(rawBody) as KaclEventEnvelope<unknown>

        // kacl's own Quartz scheduler starting/stopping a show it owns — this
        // is now the *only* place "episode" display state gets set, driven
        // by kacl confirming it actually started, not by the app's own clock.
        if (event.type === 'playout.session.started') {
          const payload = event.payload as PlayoutSessionPayload
          if (payload.source === 'scheduled' && payload.showId && payload.endsAtUtc) {
            const { db } = await import('@/db')
            const { shows } = await import('@/db/schema')
            const { eq } = await import('drizzle-orm')

            const [show] = await db.select().from(shows).where(eq(shows.id, payload.showId))
            if (show) {
              const endsAt = new Date(payload.endsAtUtc).getTime()
              const startsAt = payload.startsAtUtc ? new Date(payload.startsAtUtc).getTime() : Date.now()
              markEpisodeStart((endsAt - Date.now()) / 1000)
              const { name: siteName } = await getSiteSettings()
              setNowPlaying(
                {
                  type: 'episode',
                  title: show.title,
                  artist: show.hostName ?? siteName,
                  imageUrl: show.imageUrl ?? undefined,
                  showId: show.id,
                  startsAt,
                  endsAt,
                },
                `kacl playout.session.started: show "${show.title}" (id ${show.id})`,
              )
            }
          }
          return new Response(null, { status: 204 })
        }

        if (event.type === 'playout.session.stopped') {
          const payload = event.payload as PlayoutSessionPayload
          if (payload.source === 'scheduled') {
            clearEpisodeGuard()
            await pollKaclNowPlaying()
          }
          return new Response(null, { status: 204 })
        }

        if (event.type === 'playout.track.started') {
          const payload = event.payload as PlayoutTrackStartedPayload
          const source = payload.source.toLowerCase()

          // "show" tracks (session already handled above) never drive
          // display from here — only station rotation / dead air / jingles
          // do, same guard the old on_track/poll paths always used, so this
          // never overwrites a scheduled episode or live broadcast.
          if (source === 'show') {
            return new Response(null, { status: 204 })
          }

          if (isEpisodeExpected() || isLiveActive()) {
            return new Response(null, { status: 204 })
          }

          const { name: siteName } = await getSiteSettings()
          setNowPlaying(
            {
              type: 'dead-air',
              title: payload.title || siteName,
              artist: payload.artist || siteName,
              imageUrl: payload.imageUrl ?? undefined,
            },
            `kacl playout.track.started: source "${payload.source}" (${payload.trackPath})`,
          )
        }

        return new Response(null, { status: 204 })
      },
    },
  },
})
