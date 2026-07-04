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
let episodeEndsAt = 0 // epoch ms; 0 means no episode expected
let liveActive = false
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
const encoder = new TextEncoder()

export const getNowPlaying = (): NowPlayingState | null => {
  return state
}

export const setNowPlaying = (s: NowPlayingState): void => {
  state = s
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
    setNowPlaying({
      type: 'dead-air',
      title: src.title ?? name,
      artist: src.artist ?? name,
    })
  } catch {
    // Icecast not reachable yet — no-op
  }
}
