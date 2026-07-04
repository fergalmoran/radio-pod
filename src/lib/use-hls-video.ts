import { useEffect, type RefObject } from 'react'
import Hls from 'hls.js'

const RETRY_DELAY_MS = 2000

export const useHlsVideo = (videoRef: RefObject<HTMLVideoElement | null>, src: string | undefined): void => {
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (Hls.isSupported()) {
      let hls: Hls
      let retryTimeout: ReturnType<typeof setTimeout> | undefined
      let stopped = false

      // MediaMTX's own reference player uses this same pattern: on any fatal
      // error (including a 404 while the first HLS segments are still being
      // published) tear down and recreate the whole Hls instance after a
      // short pause, rather than trying to selectively recover in place.
      const start = () => {
        hls = new Hls()
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || stopped) return
          hls.destroy()
          retryTimeout = setTimeout(start, RETRY_DELAY_MS)
        })
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src))
        hls.attachMedia(video)
      }
      start()

      return () => {
        stopped = true
        clearTimeout(retryTimeout)
        hls.destroy()
      }
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
    }
  }, [videoRef, src])
}
