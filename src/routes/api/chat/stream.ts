import { createFileRoute } from '@tanstack/react-router'
import { addChatClient, removeChatClient } from '@/lib/server/chat-hub'

export const Route = createFileRoute('/api/chat/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const stream = new ReadableStream<Uint8Array>({
          start(ctrl) {
            addChatClient(ctrl)

            request.signal.addEventListener('abort', () => {
              removeChatClient(ctrl)
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
