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
  showId?: number
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

let confirmedEpisodeFilename: string | null = null
let confirmedEpisodeAt = 0
const basename = (path: string): string => path.split('/').pop() ?? path

/** Called by the Liquidsoap on_track webhook whenever it reports actually
 *  playing an episode audio file — proof the push really took effect on the
 *  stream, not just that Liquidsoap accepted and resolved the request
 *  (request.queue/fallback have shown an intermittent race where a resolved,
 *  decodable request still never gets switched to). Lets the scheduler
 *  verify a push worked and retry if it didn't. */
export const recordEpisodeAudioConfirmed = (filename: string): void => {
  confirmedEpisodeFilename = filename
  confirmedEpisodeAt = Date.now()
}

/** True if `filePath` was confirmed on air at or after `sinceMs`. Compares
 *  basenames since Liquidsoap's reported metadata path format isn't
 *  guaranteed to match the exact string we pushed. */
export const isEpisodeAudioConfirmed = (filePath: string, sinceMs: number): boolean => {
  return (
    confirmedEpisodeFilename !== null &&
    basename(confirmedEpisodeFilename) === basename(filePath) &&
    confirmedEpisodeAt >= sinceMs
  )
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
  // kacl reports source "show" for any active session's track, whether it's
  // our pushed episode or (unused while radio-pod owns scheduling) one of
  // kacl's own internally-scheduled shows. Our episodes are reported via the
  // confirmed-episode webhook path (recordEpisodeAudioConfirmed) and the
  // scheduler's own setNowPlaying call at broadcastAt — don't let a snapshot
  // poll clobber that. sessionId is ours to check; source isn't.
  if (snapshot.activeSessionId?.startsWith('episode:')) return

  const { name } = await getSiteSettings()
  setNowPlaying(
    {
      type: 'dead-air',
      title: snapshot.currentShowName ?? name,
      artist: snapshot.activeArtist ?? name,
    },
    `kacl playout snapshot poll (station rotation / dead air) — source "${snapshot.currentSource}"`,
  )
}
