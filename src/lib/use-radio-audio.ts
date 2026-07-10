import { useEffect, useRef, useState, type RefObject } from 'react'

export const useRadioAudio = (videoRef: RefObject<HTMLVideoElement | null>, isLive: boolean) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const streamUrl = import.meta.env.VITE_STREAM_URL ?? '/api/stream'

  // Hand off between the Icecast <audio> and the live video's own audio track
  // (shared with LiveHero) so exactly one of them is ever playing — Liquidsoap
  // only ever carries scheduled shows/dead-air, MediaMTX carries live shows.
  // The video keeps playing (muted) either way for its own visual preview;
  // the Icecast audio never starts until the user explicitly presses play.
  useEffect(() => {
    const audio = audioRef.current
    const video = videoRef.current
    if (isLive) {
      audio?.pause()
      if (video) {
        video.muted = !isPlaying
        video.play().catch(() => {})
      }
    } else {
      video?.pause()
      if (audio) {
        audio.muted = !isPlaying
        if (isPlaying) audio.play().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive])

  const togglePlay = () => {
    const next = !isPlaying
    setIsPlaying(next)
    const media = isLive ? videoRef.current : audioRef.current
    if (!media) return
    media.muted = !next
    if (next) {
      media.play().catch(() => {})
    } else if (!isLive) {
      media.pause()
    }
  }

  return { audioRef, isPlaying, togglePlay, streamUrl }
}
