import { createFileRoute } from '@tanstack/react-router'

// Proxies kacl's MP3 stream through the app server.
// Needed in dev because the Vite server uses HTTPS and browsers block
// loading an HTTP stream from an HTTPS page (mixed content).
// In production, nginx can proxy /stream.mp3 directly to kacl instead.
export const Route = createFileRoute('/api/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const kaclUrl = process.env.KACL_URL ?? 'http://localhost:8080'

        const upstream = await fetch(`${kaclUrl}/stream/mp3`, {
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
