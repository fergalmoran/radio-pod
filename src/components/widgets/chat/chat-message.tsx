import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'

export type ChatMessageData = {
  id: number
  content: string | null
  gifUrl: string | null
  gifTitle: string | null
  createdAt: Date | string
  userId: string
  userName: string
  userImage: string | null
  replyToId: number | null
  replyToContent: string | null
  replyToGifTitle: string | null
  replyToUserName: string | null
}

export const isMentionedInMessage = (message: ChatMessageData, userName: string): boolean => {
  const mentionPattern = new RegExp(`@${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  if (message.content && mentionPattern.test(message.content)) return true
  if (message.replyToUserName?.toLowerCase() === userName.toLowerCase()) return true
  return false
}

const parseContent = (content: string) => {
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

const timeLabel = (date: Date | string) => {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  message: ChatMessageData
  currentUserName?: string
  currentUserId?: string
  isAdmin?: boolean
  onReply?: (message: ChatMessageData) => void
  onScrollToMessage?: (id: number) => void
  onDelete?: (message: ChatMessageData) => void
}

export const ChatMessageItem = ({
  message,
  currentUserName,
  currentUserId,
  isAdmin,
  onReply,
  onScrollToMessage,
  onDelete,
}: Props) => {
  const initials = message.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const replyPreview = message.replyToId
    ? message.replyToContent ?? (message.replyToGifTitle ? `GIF: ${message.replyToGifTitle}` : null)
    : null

  const highlighted = !!currentUserName && isMentionedInMessage(message, currentUserName)

  return (
    <div
      className={cn(
        'flex gap-2 group rounded-md px-1 py-0.5 -mx-1',
        highlighted && 'bg-primary/10 border-l-2 border-primary pl-2',
      )}
      data-message-id={message.id}
    >
      <Avatar className="h-6 w-6 mt-0.5 shrink-0">
        {message.userImage && (
          <AvatarImage src={message.userImage} alt={message.userName} />
        )}
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold">{message.userName}</span>
          <span className="text-xs text-muted-foreground">{timeLabel(message.createdAt)}</span>
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                aria-label="Reply"
              >
                <Icons.Reply className="h-3 w-3" />
              </button>
            )}
            {onDelete && (isAdmin || currentUserId === message.userId) && (
              <button
                type="button"
                onClick={() => onDelete(message)}
                className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                aria-label="Delete message"
              >
                <Icons.Trash className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {replyPreview && (
          <button
            type="button"
            onClick={() => message.replyToId && onScrollToMessage?.(message.replyToId)}
            className="mt-0.5 mb-1 pl-2 border-l-2 border-muted-foreground/30 text-xs text-muted-foreground line-clamp-1 text-left hover:border-primary hover:text-foreground transition-colors"
          >
            <span className="font-medium">{message.replyToUserName}</span>
            {': '}
            {replyPreview}
          </button>
        )}

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
