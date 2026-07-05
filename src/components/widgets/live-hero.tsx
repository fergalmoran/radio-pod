import { useEffect, useRef, useState, type RefObject } from 'react'
import type { NowPlayingState } from '@/lib/use-now-playing'
import type { QualityLevel } from '@/lib/use-hls-video'
import { VideoControls } from '@/components/widgets/video-controls'
import { Icons } from '@/components/icons'

type LiveHeroProps = {
  nowPlaying: NowPlayingState | null
  videoRef: RefObject<HTMLVideoElement | null>
  levels: QualityLevel[]
  currentLevel: number
  setLevel: (index: number) => void
}

export const LiveHero = ({ nowPlaying, videoRef, levels, currentLevel, setLevel }: LiveHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isBuffering, setIsBuffering] = useState(true)
  const isLive = nowPlaying?.type === 'live'

  // HLS takes a few seconds to hand back the first playable segment — show a
  // spinner instead of a blank black frame for that window (and again for
  // any later rebuffer), rather than looking broken.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isLive) return
    setIsBuffering(true)
    const onWaiting = () => setIsBuffering(true)
    const onPlaying = () => setIsBuffering(false)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    return () => {
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
    }
  }, [videoRef, isLive])

  if (!isLive) return null

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div ref={containerRef} className="relative w-full aspect-video bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full" />
        {isBuffering && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Icons.Loader className="h-8 w-8 animate-spin" />
            <span className="text-sm font-medium">Waiting for connection…</span>
          </div>
        )}
        <VideoControls
          videoRef={videoRef}
          containerRef={containerRef}
          levels={levels}
          currentLevel={currentLevel}
          onSelectLevel={setLevel}
        />
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live</span>
        <p className="text-sm font-medium">{nowPlaying.title}</p>
      </div>
    </div>
  )
}
