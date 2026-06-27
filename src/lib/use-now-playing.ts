import { useEffect, useState } from 'react'

export type NowPlayingState = {
  type: 'episode' | 'dead-air'
  title: string
  artist: string
  imageUrl?: string
}

export function useNowPlaying(): NowPlayingState | null {
  const [state, setState] = useState<NowPlayingState | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/now-playing/stream')
    es.onmessage = (e) => setState(JSON.parse(e.data) as NowPlayingState)
    es.onerror = () => es.close()
    return () => es.close()
  }, [])

  return state
}
