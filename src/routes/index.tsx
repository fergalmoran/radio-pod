import { Chat } from '@/components/widgets/chat/chat'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-10">
        <Chat />
      </div>
    </div>
  )
}
