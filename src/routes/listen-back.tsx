import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/listen-back')({
  component: ListenBackPage,
})

function ListenBackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Listen Back</h1>
        <p className="text-muted-foreground">Catch up on episodes you missed.</p>
      </div>

      {/* Filter/search bar placeholder */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
            <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-56 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
