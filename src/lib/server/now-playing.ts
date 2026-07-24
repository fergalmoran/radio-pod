import '@tanstack/react-start/server-only'
import { getSiteSettings } from './site-settings'

export type NowPlayingState = {
  type: 'episode' | 'dead-air' | 'live'
  title: string
  artist: string
  imageUrl?: string
  startsAt?: number // epoch ms
  endsAt?: number   // epoch ms
  // live-only:
  showId?: string
  hostUserId?: string
  hlsUrl?: string
  startedAt?: number // epoch ms
}

let state: NowPlayingState | null = null
let stateReason = 'No state set yet'
let stateSetAt = 0 // epoch ms
let episodeEndsAt = 0 // epoch ms; 0 means no episode expected
let liveActive = false
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
const encoder = new TextEncoder()

export const getNowPlaying = (): NowPlayingState | null => {
  return state
}

/** Human-readable explanation of why the current state was set — surfaced on
 *  the /debug page so "why is this playing" doesn't require reading logs. */
export const getNowPlayingDebug = (): { reason: string; setAt: number } => {
  return { reason: stateReason, setAt: stateSetAt }
}

export const setNowPlaying = (s: NowPlayingState, reason = 'Unknown'): void => {
  state = s
  stateReason = reason
  stateSetAt = Date.now()
  const chunk = encoder.encode(`data: ${JSON.stringify(s)}\n\n`)
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(chunk)
    } catch {
      clients.delete(ctrl)
    }
  }
}

/** Called by the scheduler when an episode starts. Guards the window so stale
 *  on_track webhooks and Icecast polls don't overwrite the episode state. */
export const markEpisodeStart = (durationSeconds: number): void => {
  episodeEndsAt = Date.now() + durationSeconds * 1000
}

/** True while an episode is expected to still be playing. */
export const isEpisodeExpected = (): boolean => {
  return Date.now() < episodeEndsAt
}

export const getEpisodeEndsAt = (): number => episodeEndsAt

/** Lifts the episode guard window, e.g. when an episode is stopped early. */
export const clearEpisodeGuard = (): void => {
  episodeEndsAt = 0
}

/** Called by the live webhook when OBS starts publishing. Guards the state so
 *  Icecast polls don't overwrite the live badge while a stream is active. */
export const markLiveStart = (): void => {
  liveActive = true
}

/** True while a live stream is expected to still be publishing. */
export const isLiveActive = (): boolean => {
  return liveActive
}

/** Lifts the live guard, e.g. when the stream ends or is force-stopped. */
export const clearLiveGuard = (): void => {
  liveActive = false
}

export const addClient = (ctrl: ReadableStreamDefaultController<Uint8Array>): void => {
  clients.add(ctrl)
}

export const removeClient = (ctrl: ReadableStreamDefaultController<Uint8Array>): void => {
  clients.delete(ctrl)
}

/** Polls kacl's playout snapshot — used to seed state on startup and as a
 *  safety-net reconciliation, since the primary source of truth is now the
 *  `playout.track.started` webhook (see routes/api/kacl/webhook.ts). */
export const pollKaclNowPlaying = async (): Promise<void> => {
  if (isEpisodeExpected() || isLiveActive()) return

  const { getPlayoutSnapshot } = await import('./kacl-client')
  const snapshot = await getPlayoutSnapshot()
  if (!snapshot || !snapshot.currentSource) return
  // kacl reports source "show" for any active session's track. A scheduled
  // show's display is set directly from kacl's own playout.session.started
  // webhook (see routes/api/kacl/webhook.ts) — don't let this poll clobber
  // that. kacl's session-id format for its own scheduled shows is
  // "show:{guid:N}" (PlayoutCoordinator.StartShowAsync).
  if (snapshot.activeSessionId?.startsWith('show:')) return

  const { name } = await getSiteSettings()
  setNowPlaying(
    {
      type: 'dead-air',
      // currentShowName is null for dead-air/jingle rotation (there's no
      // "show") — currentTrackTitle/currentTrackArtist are kacl's ID3-tag
      // (or filename-fallback) read for the actual track. Using
      // currentShowName here was the bug: every 15s this poll would clobber
      // a good webhook-set title with the site name, since dead-air tracks
      // never have a show name.
      title: snapshot.currentTrackTitle ?? name,
      artist: snapshot.currentTrackArtist ?? name,
    },
    `kacl playout snapshot poll (station rotation / dead air) — source "${snapshot.currentSource}"`,
  )
}
