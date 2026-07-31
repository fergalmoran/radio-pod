import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ChatMessageData } from '@/components/widgets/chat/chat-message'

type ChatEvent =
  | { type: 'message'; message: ChatMessageData }
  | { type: 'delete'; id: string }

const RECONNECT_DELAY_MS = 2000

/** Keeps the ['chat', 'messages'] query cache in sync via push instead of
 *  polling — mirrors the now-playing SSE pattern in use-now-playing.ts. */
export const useChatStream = (): void => {
  const queryClient = useQueryClient()

  useEffect(() => {
    let es: EventSource
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const connect = () => {
      es = new EventSource('/api/chat/stream')
      es.onmessage = (e) => {
        const event = JSON.parse(e.data) as ChatEvent

        queryClient.setQueryData(
          ['chat', 'messages'],
          (old: ChatMessageData[] | undefined) => {
            if (!old) return old
            if (event.type === 'delete') {
              return old.filter((m) => m.id !== event.id)
            }
            if (old.some((m) => m.id === event.message.id)) return old
            return [...old, event.message]
          },
        )
      }
      es.onerror = () => {
        es.close()
        if (!stopped) reconnectTimeout = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }
    connect()

    return () => {
      stopped = true
      clearTimeout(reconnectTimeout)
      es.close()
    }
  }, [queryClient])
}
