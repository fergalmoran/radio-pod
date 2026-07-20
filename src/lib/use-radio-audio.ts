import { useEffect, useRef, useState, type RefObject } from 'react'
import type { NowPlayingState } from './use-now-playing'

export const useRadioAudio = (videoRef: RefObject<HTMLVideoElement | null>, nowPlaying: NowPlayingState | null) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(() =>
    parseFloat((typeof localStorage !== 'undefined' ? localStorage.getItem('player-volume') : null) ?? '1'),
  )
  const streamUrl = import.meta.env.VITE_STREAM_URL ?? '/api/stream'
  const isLive = nowPlaying?.type === 'live'

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
        video.volume = volume
        video.muted = !isPlaying
        video.play().catch(() => {})
      }
    } else {
      video?.pause()
      if (audio) {
        audio.volume = volume
        audio.muted = !isPlaying
        if (isPlaying) audio.play().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive])

  // The Icecast <audio> connection stays open continuously across dead-air/
  // episode switches, but by the time it's been open a while the browser has
  // usually pre-fetched several seconds of dead air ahead of playback
  // position. Liquidsoap switches source on the wire almost immediately
  // (radio.liq's buffer() pre-buffers for ~1s before cutting over), but the
  // client won't audibly reach that point until it plays through whatever
  // it already had buffered — several seconds of stale dead air. So we do
  // still force a reconnect, just delayed past Liquidsoap's own switch
  // window instead of racing it (an immediate reconnect lands *before* the
  // switch and just picks up a fresh dose of dead air).
  const lastEpisodeStartRef = useRef<number | undefined>(undefined)
  const hasReceivedStateRef = useRef(false)
  useEffect(() => {
    if (nowPlaying === null) return
    const currentEpisodeStart = nowPlaying.type === 'episode' ? nowPlaying.startsAt : undefined

    // Baseline off the first now-playing update of any kind (dead-air, live,
    // or already-mid-episode), not the first *episode* one specifically —
    // otherwise the very first dead-air-to-episode switch after page load
    // (the common case) gets mistaken for the baseline and never reconnects.
    if (!hasReceivedStateRef.current) {
      hasReceivedStateRef.current = true
      lastEpisodeStartRef.current = currentEpisodeStart
      return
    }
    if (currentEpisodeStart === undefined) return
    if (lastEpisodeStartRef.current === currentEpisodeStart) return
    lastEpisodeStartRef.current = currentEpisodeStart

    const timer = setTimeout(() => {
      const audio = audioRef.current
      if (!audio) return
      const wasPlaying = isPlaying
      audio.load()
      if (wasPlaying) audio.play().catch(() => {})
    }, 2000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying])

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

  const setVolume = (next: number) => {
    setVolumeState(next)
    localStorage.setItem('player-volume', String(next))
    const media = isLive ? videoRef.current : audioRef.current
    if (media) media.volume = next
  }

  return { audioRef, isPlaying, togglePlay, streamUrl, volume, setVolume }
}
