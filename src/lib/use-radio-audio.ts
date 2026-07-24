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

  // Deliberately no forced reconnect on dead-air/episode switches: kacl's
  // crossfade makes the underlying MP3 stream genuinely gapless across a
  // transition (verified via silencedetect spanning a real switch), so the
  // <audio> element just keeps playing the one continuous connection straight
  // through it. An earlier version force-reconnected a few seconds after
  // every episode start to skip stale buffered audio — a workaround carried
  // over from the old Liquidsoap setup — but it raced kacl's crossfade
  // window and produced an audible cut/dead-air-restart/fade artifact of its
  // own. Removed rather than re-tuned, since the thing it was working around
  // (an abrupt source switch) no longer exists.

  // Mute/unmute rather than actually pause — this is a live broadcast, not
  // seekable on-demand content, so "pause and resume" would mean coming back
  // to a stale position instead of what's actually on air. The element just
  // keeps the connection running in the background; toggling back on is
  // instant and always exactly current, no reconnect needed.
  const togglePlay = () => {
    const next = !isPlaying
    setIsPlaying(next)
    const media = isLive ? videoRef.current : audioRef.current
    if (!media) return
    media.muted = !next
    if (next) {
      media.play().catch(() => {})
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
