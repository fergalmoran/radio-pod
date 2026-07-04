import { useEffect, useRef, useState, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Icons } from '../icons'
import type { NowPlayingState } from '@/lib/use-now-playing'
import { useSiteSettings } from '@/lib/use-site-settings'

type PlayerBarProps = {
  nowPlaying: NowPlayingState | null
  videoRef: RefObject<HTMLVideoElement | null>
}

export const PlayerBar = ({ nowPlaying, videoRef }: PlayerBarProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(() => parseFloat((typeof localStorage !== 'undefined' ? localStorage.getItem('player-volume') : null) ?? '1'))
  const [isMuted, setIsMuted] = useState(false)
  const isLive = nowPlaying?.type === 'live'

  // Attempt autoplay on mount; if blocked, the play button handles it
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    audioRef.current?.play().catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hand off between the Icecast <audio> and the live video's own audio track
  // (shared with LiveHero) so exactly one of them is ever playing — Liquidsoap
  // only ever carries scheduled shows/dead-air, MediaMTX carries live shows.
  useEffect(() => {
    const audio = audioRef.current
    const video = videoRef.current
    if (isLive) {
      audio?.pause()
      if (video) {
        video.volume = volume
        video.muted = isMuted
        video.play().catch(() => { })
      }
    } else {
      video?.pause()
      if (audio) {
        audio.volume = volume
        audio.muted = isMuted
        audio.play().catch(() => { })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive])

  // Reflect the shared video element's play/pause state while it's the active
  // source (mirrors VideoControls' own listener on the same element).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isLive) return
    setIsPlaying(!video.paused)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [videoRef, isLive])

  const activeMedia = () => (isLive ? videoRef.current : audioRef.current)

  const togglePlay = () => {
    const media = activeMedia()
    if (!media) return
    if (media.paused) {
      media.play().catch(() => { })
    } else {
      media.pause()
    }
  }

  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    const media = activeMedia()
    if (media) media.muted = next
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
    const media = activeMedia()
    if (media) {
      media.volume = v
      media.muted = v === 0
    }
    localStorage.setItem('player-volume', String(v))
  }

  const settings = useSiteSettings();

  const streamUrl = import.meta.env.VITE_STREAM_URL ?? '/api/stream'

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <audio
        ref={audioRef}
        src={streamUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Now playing info */}
        <div className="flex items-center gap-3 w-56 shrink-0">
          {nowPlaying?.imageUrl ? (
            <img
              src={nowPlaying.imageUrl}
              alt=""
              className="h-10 w-10 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-muted shrink-0 flex items-center justify-center">
              <Icons.Radio className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-medium truncate leading-none">
              {nowPlaying?.title ?? settings.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {nowPlaying?.artist ?? 'Robot Powered Radio'}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" aria-label="Favorite">
            <Icons.Heart className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Playback controls */}
        <div className="flex items-center gap-1 mx-auto">
          <Button variant="ghost" size="icon" aria-label="Previous" disabled>
            <Icons.SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" aria-label="Play / Pause" onClick={togglePlay}>
            {isPlaying ? (
              <Icons.Pause className="h-4 w-4" />
            ) : (
              <Icons.Play className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next" disabled>
            <Icons.SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Volume */}
        <div className="flex items-center gap-2 w-36 shrink-0 ml-auto">
          <button
            type="button"
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <Icons.VolumeX className="h-4 w-4" />
            ) : (
              <Icons.Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full h-1.5 accent-primary cursor-pointer"
            aria-label="Volume"
          />
        </div>
      </div>
    </footer>
  )
}
