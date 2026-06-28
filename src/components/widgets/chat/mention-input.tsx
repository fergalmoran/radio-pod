import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type MentionUser = { id: string; name: string; image: string | null }
export type MentionInputHandle = { focus(): void }

type Props = {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  users: MentionUser[]
  disabled?: boolean
  placeholder?: string
}

function detectMention(
  value: string,
  cursorPos: number,
): { search: string; start: number } | null {
  const before = value.slice(0, cursorPos)
  const match = before.match(/@(\w*)$/)
  if (!match) return null
  return { search: match[1].toLowerCase(), start: before.length - match[0].length }
}

export const MentionInput = forwardRef<MentionInputHandle, Props>(function MentionInput(
  { value, onChange, onSend, users, disabled, placeholder },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mention, setMention] = useState<{ search: string; start: number } | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  useImperativeHandle(ref, () => ({
    focus() { textareaRef.current?.focus() },
  }))

  const filteredUsers = mention
    ? users.filter((u) => u.name.toLowerCase().includes(mention.search)).slice(0, 5)
    : []

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = '0'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  // Reset height when value is cleared externally (e.g. after send)
  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    autoResize(e.target)
    const cursor = e.target.selectionStart ?? e.target.value.length
    setMention(detectMention(e.target.value, cursor))
    setMentionIndex(0)
  }

  const insertMention = (user: MentionUser) => {
    if (!mention) return
    const cursor = textareaRef.current?.selectionStart ?? value.length
    const before = value.slice(0, mention.start)
    const after = value.slice(cursor)
    const next = `${before}@${user.name} ${after}`
    onChange(next)
    setMention(null)
    setTimeout(() => {
      if (!textareaRef.current) return
      const pos = mention.start + user.name.length + 2
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(pos, pos)
      autoResize(textareaRef.current)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => Math.min(i + 1, filteredUsers.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        setMention(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="relative flex-1">
      {mention && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-md overflow-hidden z-20">
          {filteredUsers.map((user, i) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(user)
              }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left',
                i === mentionIndex && 'bg-accent',
              )}
            >
              <span className="font-medium">@{user.name}</span>
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 leading-snug"
        style={{ minHeight: '36px', maxHeight: '96px', overflow: 'hidden' }}
      />
    </div>
  )
})
