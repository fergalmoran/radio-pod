import { useEffect, useState } from 'react'

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

export const useNowPlaying = (): NowPlayingState | null => {
  const [state, setState] = useState<NowPlayingState | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/now-playing/stream')
    es.onmessage = (e) => setState(JSON.parse(e.data) as NowPlayingState)
    es.onerror = () => es.close()
    return () => es.close()
  }, [])

  return state
}
