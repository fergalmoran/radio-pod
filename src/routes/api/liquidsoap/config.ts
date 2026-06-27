import { createFileRoute } from '@tanstack/react-router'

// Called by Liquidsoap on startup to get its Icecast password.
// Returns plain text — simpler than JSON for Liquidsoap to consume.
export const Route = createFileRoute('/api/liquidsoap/config')({
  server: {
    handlers: {
      GET: async () => {
        const password = process.env.ICECAST_SOURCE_PASSWORD ?? 'changeme'
        return new Response(password, {
          headers: { 'Content-Type': 'text/plain' },
        })
      },
    },
  },
})
