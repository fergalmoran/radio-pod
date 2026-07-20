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

type IcecastSource = { title?: string; artist?: string }
type IcecastStatusJson = { icestats: { source?: IcecastSource | IcecastSource[] } }

export const pollIcecastNowPlaying = async (): Promise<void> => {
  if (isEpisodeExpected() || isLiveActive()) return

  const host = process.env.ICECAST_HOST ?? 'localhost'
  const port = process.env.ICECAST_PORT ?? '8000'
  try {
    const res = await fetch(`http://${host}:${port}/status-json.xsl`)
    if (!res.ok) return
    const data = (await res.json()) as IcecastStatusJson
    const src = Array.isArray(data.icestats.source)
      ? data.icestats.source[0]
      : data.icestats.source
    if (!src) return
    const { name } = await getSiteSettings()
    setNowPlaying(
      {
        type: 'dead-air',
        title: src.title ?? name,
        artist: src.artist ?? name,
      },
      `Icecast metadata poll (station rotation / dead air) — source title "${src.title ?? '(none)'}"`,
    )
  } catch {
    // Icecast not reachable yet — no-op
  }
}
