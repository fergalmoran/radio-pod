import { createFileRoute } from '@tanstack/react-router'
import { setNowPlaying } from '@/lib/server/now-playing'
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
