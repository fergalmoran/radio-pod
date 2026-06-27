import { createFileRoute } from '@tanstack/react-router'
import { setNowPlaying, isEpisodeExpected } from '@/lib/server/now-playing'
import { ensureRunning } from '@/lib/server/scheduler'

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
        const isEpisode = filename.includes('/mnt/audio/shows')

        // Ignore dead-air on_track events that arrive during an episode window —
        // they're stale metadata from the track that was interrupted at start time.
        if (!isEpisode && isEpisodeExpected()) {
          return new Response(null, { status: 204 })
        }

        const displayTitle =
          title || filename.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Surge FM'

        setNowPlaying({
          type: isEpisode ? 'episode' : 'dead-air',
          title: displayTitle,
          artist: isEpisode ? (artist || 'Surge FM') : 'Surge FM',
        })

        return new Response(null, { status: 204 })
      },
    },
  },
})
