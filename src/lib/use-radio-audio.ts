import { useEffect, useRef, useState, type RefObject } from 'react'

export const useRadioAudio = (videoRef: RefObject<HTMLVideoElement | null>, isLive: boolean) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const streamUrl = import.meta.env.VITE_STREAM_URL ?? '/api/stream'

  // Attempt autoplay on mount; if blocked, toggleMute's play() call recovers it
  useEffect(() => {
    audioRef.current?.play().catch(() => {})
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
        video.muted = isMuted
        video.play().catch(() => {})
      }
    } else {
      video?.pause()
      if (audio) {
        audio.muted = isMuted
        audio.play().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive])

  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    const media = isLive ? videoRef.current : audioRef.current
    if (!media) return
    media.muted = next
    if (media.paused) media.play().catch(() => {})
  }

  return { audioRef, isMuted, toggleMute, streamUrl }
}
