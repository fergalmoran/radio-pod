import { useRef } from 'react'
import { useNowPlaying } from '@/lib/use-now-playing'
import { useHlsVideo } from '@/lib/use-hls-video'
import { VideoControls } from '@/components/widgets/video-controls'

export const LiveHero = () => {
  const nowPlaying = useNowPlaying()
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isLive = nowPlaying?.type === 'live'

  const { levels, currentLevel, setLevel } = useHlsVideo(videoRef, isLive ? nowPlaying?.hlsUrl : undefined)

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
