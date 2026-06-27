import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { chatMessagesQueryOptions, chatUsersQueryOptions } from '@/lib/queries/chat'
import { sendChatMessage } from '@/server/fns/chat-fns'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { ChatMessageItem, type ChatMessageData } from './chat-message'
import { GiphyPicker } from './giphy-picker'
import { MentionInput } from './mention-input'

export function Chat() {
  const { session } = useRouteContext({ from: '__root__' })
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [showGiphy, setShowGiphy] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [replyTo, setReplyTo] = useState<ChatMessageData | null>(null)

  const { data: messages = [] } = useQuery(chatMessagesQueryOptions)
  const { data: chatUsers = [] } = useQuery(chatUsersQueryOptions)

  const sendMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] }),
  })

  // Auto-scroll only when the user is near the bottom
  useEffect(() => {
    const el = scrollRef.current
    if (el && isNearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isNearBottom])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsNearBottom(distanceFromBottom < 80)
  }

  const clearReply = () => setReplyTo(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || sendMutation.isPending) return
    sendMutation.mutate({ data: { content: trimmed, replyToId: replyTo?.id } })
    setText('')
    setShowGiphy(false)
    setIsNearBottom(true)
    clearReply()
  }

  const handleGifSelect = ({ url, title }: { url: string; title: string }) => {
    sendMutation.mutate({ data: { gifUrl: url, gifTitle: title, replyToId: replyTo?.id } })
    setShowGiphy(false)
    setIsNearBottom(true)
    clearReply()
  }

  return (
    <div className="flex flex-col h-full border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <h3 className="text-sm font-semibold">Live Chat</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Be the first to say hello!
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              onReply={session ? setReplyTo : undefined}
            />
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t px-3 py-3 flex flex-col gap-2 shrink-0">
        {replyTo && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <Icons.Reply className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate">
              Replying to <span className="font-medium text-foreground">{replyTo.userName}</span>
              {replyTo.content ? `: ${replyTo.content}` : ''}
            </span>
            <button
              type="button"
              onClick={clearReply}
              className="shrink-0 hover:text-foreground"
              aria-label="Cancel reply"
            >
              <Icons.X className="h-3 w-3" />
            </button>
          </div>
        )}

        {showGiphy && (
          <GiphyPicker onSelect={handleGifSelect} onClose={() => setShowGiphy(false)} />
        )}

        {session ? (
          <div className="flex gap-1.5 items-center">
            <MentionInput
              value={text}
              onChange={setText}
              onSend={handleSend}
              users={chatUsers}
              disabled={sendMutation.isPending}
              placeholder={replyTo ? `Reply to ${replyTo.userName}…` : 'Say something…'}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => setShowGiphy((v) => !v)}
              aria-label="GIF picker"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Icons.Image className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
              aria-label="Send message"
              className="shrink-0"
            >
              <Icons.Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-1">
            <Link to="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>{' '}
            to join the chat
          </p>
        )}
      </div>
    </div>
  )
}
