import { createFileRoute } from '@tanstack/react-router'
import { addClient, removeClient, getNowPlaying } from '@/lib/server/now-playing'
import { ensureRunning } from '@/lib/server/scheduler'

const encoder = new TextEncoder()

export const Route = createFileRoute('/api/now-playing/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        ensureRunning()

        const stream = new ReadableStream<Uint8Array>({
          start(ctrl) {
            addClient(ctrl)

            // Send current state immediately so reconnecting clients don't wait
            const current = getNowPlaying()
            if (current) {
              ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(current)}\n\n`))
            }

            request.signal.addEventListener('abort', () => {
              removeClient(ctrl)
              try { ctrl.close() } catch { /* already closed */ }
            })
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
