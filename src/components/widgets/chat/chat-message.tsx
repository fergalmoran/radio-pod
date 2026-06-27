import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export type ChatMessageData = {
  id: number
  content: string | null
  gifUrl: string | null
  gifTitle: string | null
  createdAt: Date | string
  userId: string
  userName: string
  userImage: string | null
}

function parseContent(content: string) {
  const parts = content.split(/(@\w[\w.]*)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-primary font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

function timeLabel(date: Date | string) {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatMessageItem({ message }: { message: ChatMessageData }) {
  const initials = message.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex gap-2 group">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        {message.userImage && (
          <AvatarImage src={message.userImage} alt={message.userName} />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold">{message.userName}</span>
          <span className="text-xs text-muted-foreground">{timeLabel(message.createdAt)}</span>
        </div>
        {message.content && (
          <p className="text-sm leading-snug break-words mt-0.5">
            {parseContent(message.content)}
          </p>
        )}
        {message.gifUrl && (
          <img
            src={message.gifUrl}
            alt={message.gifTitle ?? 'GIF'}
            className="mt-1 rounded-md max-w-[200px] max-h-[150px] object-cover"
          />
        )}
      </div>
    </div>
  )
}
