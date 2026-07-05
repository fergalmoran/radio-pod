import { useEffect, useRef, useState, type RefObject } from 'react'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { QualityLevel } from '@/lib/use-hls-video'

const HIDE_DELAY_MS = 2500
const VOLUME_STORAGE_KEY = 'live-video-volume'

type VideoControlsProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  levels: QualityLevel[]
  currentLevel: number
  onSelectLevel: (index: number) => void
}

export const VideoControls = ({ videoRef, containerRef, levels, currentLevel, onSelectLevel }: VideoControlsProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(() => parseFloat((typeof localStorage !== 'undefined' ? localStorage.getItem(VOLUME_STORAGE_KEY) : null) ?? '1'))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    setIsPlaying(!video.paused)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [containerRef])

  useEffect(() => {
    clearTimeout(hideTimeout.current)
    if (isPlaying && !menuOpen) {
      hideTimeout.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS)
    }
    return () => clearTimeout(hideTimeout.current)
  }, [isPlaying, menuOpen])

  const showControls = () => {
    setVisible(true)
    clearTimeout(hideTimeout.current)
    if (isPlaying && !menuOpen) {
      hideTimeout.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS)
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const next = !isMuted
    setIsMuted(next)
    video.muted = next
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    setIsMuted(v === 0)
    const video = videoRef.current
    if (video) {
      video.volume = v
      video.muted = v === 0
    }
    localStorage.setItem(VOLUME_STORAGE_KEY, String(v))
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current?.requestFullscreen()
    }
  }

  return (
    <div
      className="absolute inset-0"
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (isPlaying && !menuOpen) setVisible(false)
      }}
      onTouchStart={showControls}
    >
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Icons.Pause className="h-5 w-5" /> : <Icons.Play className="h-5 w-5" />}
        </Button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="text-white/90 transition-colors hover:text-white"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <Icons.VolumeX className="h-4 w-4" /> : <Icons.Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="h-1 w-20 cursor-pointer accent-white"
            aria-label="Volume"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" aria-label="Settings">
                <Icons.Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Quality</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={String(currentLevel)} onValueChange={(value) => onSelectLevel(Number(value))}>
                <DropdownMenuRadioItem value="-1">Auto</DropdownMenuRadioItem>
                {[...levels]
                  .sort((a, b) => b.height - a.height)
                  .map((level) => (
                    <DropdownMenuRadioItem key={level.index} value={String(level.index)}>
                      {level.height}p
                    </DropdownMenuRadioItem>
                  ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Icons.Minimize className="h-4 w-4" /> : <Icons.Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
