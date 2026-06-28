import { Chat } from '@/components/widgets/chat/chat'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 min-w-0 h-full">
        <Chat />
      </div>
    </div>
  )
}
