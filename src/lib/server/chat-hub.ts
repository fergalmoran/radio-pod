import '@tanstack/react-start/server-only'
import type { ChatMessageData } from '@/components/widgets/chat/chat-message'

export type ChatEvent =
  | { type: 'message'; message: ChatMessageData }
  | { type: 'delete'; id: string }

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
const encoder = new TextEncoder()

export const addChatClient = (ctrl: ReadableStreamDefaultController<Uint8Array>): void => {
  clients.add(ctrl)
}

export const removeChatClient = (ctrl: ReadableStreamDefaultController<Uint8Array>): void => {
  clients.delete(ctrl)
}

export const broadcastChatEvent = (event: ChatEvent): void => {
  const chunk = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(chunk)
    } catch {
      clients.delete(ctrl)
    }
  }
}
