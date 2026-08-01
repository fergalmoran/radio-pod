import '@tanstack/react-start/server-only'
import { setNowPlaying, markEpisodeStart, clearEpisodeGuard, isEpisodeExpected, isLiveActive, pollKaclNowPlaying } from './now-playing'
import { getSiteSettings } from './site-settings'

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

/** Dispatches a playout.* event from kacl (pushed over the SignalR hub —
 *  see playout-hub-client.ts) to the app's Now Playing state. Same logic
 *  that used to live in the /api/kacl/webhook route handler when kacl
 *  delivered these over an inbound webhook instead of a push connection. */
export const handlePlayoutEvent = async (event: KaclEventEnvelope<unknown>): Promise<void> => {
  // kacl's own Quartz scheduler starting/stopping a show it owns — this is
  // the *only* place "episode" display state gets set, driven by kacl
  // confirming it actually started, not by the app's own clock.
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
    return
  }

  if (event.type === 'playout.session.stopped') {
    const payload = event.payload as PlayoutSessionPayload
    if (payload.source === 'scheduled') {
      clearEpisodeGuard()
      await pollKaclNowPlaying()
    }
    return
  }

  if (event.type === 'playout.track.started') {
    const payload = event.payload as PlayoutTrackStartedPayload
    const source = payload.source.toLowerCase()

    // "show" tracks (session already handled above) never drive display
    // from here — only station rotation / dead air / jingles do, same
    // guard the old on_track/poll paths always used, so this never
    // overwrites a scheduled episode or live broadcast.
    if (source === 'show') {
      return
    }

    if (isEpisodeExpected() || isLiveActive()) {
      return
    }

    const { name: siteName } = await getSiteSettings()
    const title = payload.title || siteName
    setNowPlaying(
      {
        type: 'dead-air',
        // artist falls back to title, not the site name — OnAirNow only
        // renders "artist - title" when they differ, so falling back to
        // the site name rendered as "Surge FM - <filename>" for any
        // dead-air track without an ID3 artist tag.
        title,
        artist: payload.artist || title,
        imageUrl: payload.imageUrl ?? undefined,
      },
      `kacl playout.track.started: source "${payload.source}" (${payload.trackPath})`,
    )
  }
}
