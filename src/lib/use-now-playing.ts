import { useEffect, useState } from 'react'

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

const RECONNECT_DELAY_MS = 2000

export const useNowPlaying = (): NowPlayingState | null => {
  const [state, setState] = useState<NowPlayingState | null>(null)

  useEffect(() => {
    let es: EventSource
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    // EventSource normally auto-reconnects on its own after an error, but
    // that only works if we don't close() it ourselves. Closing here (rather
    // than leaving the connection for the browser to retry) previously left
    // nowPlaying permanently frozen after any transient drop — e.g. going
    // live would update the DB and show-live-info query, but the site's
    // stale SSE state would never reflect it until a full page reload.
    const connect = () => {
      es = new EventSource('/api/now-playing/stream')
      es.onmessage = (e) => setState(JSON.parse(e.data) as NowPlayingState)
      es.onerror = () => {
        es.close()
        if (!stopped) reconnectTimeout = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }
    connect()

    return () => {
      stopped = true
      clearTimeout(reconnectTimeout)
      es.close()
    }
  }, [])

  return state
}
