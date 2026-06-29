import '@tanstack/react-start/server-only'

export type NowPlayingState = {
  type: 'episode' | 'dead-air'
  title: string
  artist: string
  imageUrl?: string
  startsAt?: number // epoch ms
  endsAt?: number   // epoch ms
}

let state: NowPlayingState | null = null
let episodeEndsAt = 0 // epoch ms; 0 means no episode expected
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

export const addClient = (ctrl: ReadableStreamDefaultController<Uint8Array>): void => {
  clients.add(ctrl)
}

export const removeClient = (ctrl: ReadableStreamDefaultController<Uint8Array>): void => {
  clients.delete(ctrl)
}

type IcecastSource = { title?: string; artist?: string }
type IcecastStatusJson = { icestats: { source?: IcecastSource | IcecastSource[] } }

export const pollIcecastNowPlaying = async (): Promise<void> => {
  if (isEpisodeExpected()) return

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
    setNowPlaying({
      type: 'dead-air',
      title: src.title ?? 'Surge FM',
      artist: src.artist ?? 'Surge FM',
    })
  } catch {
    // Icecast not reachable yet — no-op
  }
}
