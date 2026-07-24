import { useEffect, useRef, useState, type RefObject } from 'react'
import type { NowPlayingState } from '@/lib/use-now-playing'
import type { QualityLevel } from '@/lib/use-hls-video'
import { VideoControls } from '@/components/widgets/video-controls'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'

type LiveHeroProps = {
  nowPlaying: NowPlayingState | null
  videoRef: RefObject<HTMLVideoElement | null>
  levels: QualityLevel[]
  currentLevel: number
  setLevel: (index: number) => void
  // Set from the moment "Go Live" arms a show until OBS actually starts
  // publishing (nowPlaying flips to 'live') — there's a real gap between those
  // two where nothing else on the page would otherwise indicate anything is happening.
  pendingShow?: { id: string; title: string } | null
  // At lg+, fill the height handed down by a theater-mode flex row instead of
  // the usual width-driven aspect-video box — see __root.tsx's isTheater layout.
  fillHeight?: boolean
}

export const LiveHero = ({ nowPlaying, videoRef, levels, currentLevel, setLevel, pendingShow, fillHeight }: LiveHeroProps) => {
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

  if (!isLive) {
    if (!pendingShow) return null
    return (
      <div className={cn('rounded-xl border bg-card overflow-hidden', fillHeight && 'lg:h-full')}>
        <div
          className={cn(
            'relative w-full aspect-video bg-black flex flex-col items-center justify-center gap-2 text-white',
            fillHeight && 'lg:aspect-auto lg:h-full',
          )}
        >
          <Icons.Loader className="h-8 w-8 animate-spin" />
          <span className="text-sm font-medium">Waiting for {pendingShow.title} to go live…</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', fillHeight && 'lg:h-full')}>
      <div
        ref={containerRef}
        className={cn('relative w-full aspect-video bg-black', fillHeight && 'lg:aspect-auto lg:h-full')}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cn('h-full w-full', fillHeight && 'lg:object-contain')}
        />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Live</span>
        </div>
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
    </div>
  )
}
