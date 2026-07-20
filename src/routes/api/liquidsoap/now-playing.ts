import { createFileRoute } from '@tanstack/react-router'
import { setNowPlaying, isEpisodeExpected, recordEpisodeAudioConfirmed } from '@/lib/server/now-playing'
import { ensureRunning } from '@/lib/server/scheduler'
import { getSiteSettings } from '@/lib/server/site-settings'

export const Route = createFileRoute('/api/liquidsoap/now-playing')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        ensureRunning()

        const body = await request.json() as {
          title?: string
          artist?: string
          filename?: string
        }

        const { title = '', artist = '', filename = '' } = body
        // Same env var scheduler.ts uses to push episode paths to Liquidsoap
        // (LIQUIDSOAP_AUDIO_DIR=/mnt/shows in docker-compose.yml/.env) — must
        // stay in sync with that, not a separately hardcoded path.
        const audioDir = process.env.LIQUIDSOAP_AUDIO_DIR ?? '/mnt/audio/shows'
        const isEpisode = filename.includes(audioDir)

        // Record proof of an actual on-air switch regardless of the display
        // guard below — the scheduler uses this to verify a push worked and
        // retry if Liquidsoap silently never switched to it.
        if (isEpisode) recordEpisodeAudioConfirmed(filename)

        // Ignore on_track events that arrive during an episode window — the
        // scheduler already set richer state (show title, image, start/end
        // times) from the DB when the show started. That's authoritative;
        // the episode audio file's own ID3 tags (or bare filename, when a
        // file has none) are not a reliable replacement for it, and this
        // event carries none of the timing/image fields anyway.
        if (isEpisodeExpected()) {
          return new Response(null, { status: 204 })
        }

        const { name: siteName } = await getSiteSettings()
        const displayTitle =
          title || filename.split('/').pop()?.replace(/\.[^.]+$/, '') || siteName

        setNowPlaying(
          {
            type: isEpisode ? 'episode' : 'dead-air',
            title: displayTitle,
            artist: isEpisode ? (artist || siteName) : siteName,
          },
          isEpisode
            ? `Liquidsoap on_track: playing scheduled show audio file (${filename})`
            : `Liquidsoap on_track: station rotation / dead air track (${filename || '(no filename)'})`,
        )

        return new Response(null, { status: 204 })
      },
    },
  },
})
