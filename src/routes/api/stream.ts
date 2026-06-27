import { createFileRoute } from '@tanstack/react-router'

// Proxies the Icecast stream through the app server.
// Needed in dev because the Vite server uses HTTPS and browsers block
// loading an HTTP Icecast stream from an HTTPS page (mixed content).
// In production, nginx proxies /stream.mp3 directly to Icecast instead.
export const Route = createFileRoute('/api/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = process.env.ICECAST_HOST ?? 'localhost'
        const port = process.env.ICECAST_PORT ?? '8000'
        const icecastUrl = `http://${host}:${port}/stream.mp3`

        const upstream = await fetch(icecastUrl, {
          headers: { Range: request.headers.get('Range') ?? '' },
          signal: request.signal,
        })

        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          },
        })
      },
    },
  },
})
