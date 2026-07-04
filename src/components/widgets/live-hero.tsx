import { useRef, type RefObject } from 'react'
import type { NowPlayingState } from '@/lib/use-now-playing'
import type { QualityLevel } from '@/lib/use-hls-video'
import { VideoControls } from '@/components/widgets/video-controls'

type LiveHeroProps = {
  nowPlaying: NowPlayingState | null
  videoRef: RefObject<HTMLVideoElement | null>
  levels: QualityLevel[]
  currentLevel: number
  setLevel: (index: number) => void
}

export const LiveHero = ({ nowPlaying, videoRef, levels, currentLevel, setLevel }: LiveHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isLive = nowPlaying?.type === 'live'

  if (!isLive) return null

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div ref={containerRef} className="relative w-full aspect-video bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full" />
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
