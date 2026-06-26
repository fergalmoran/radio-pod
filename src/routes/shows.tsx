import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/shows')({
  component: ShowsPage,
})

function ShowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Shows</h1>
        <p className="text-muted-foreground">All programmes on radio-pod.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-start p-4 rounded-xl border bg-card">
            <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
              <Skeleton className="h-7 w-28 rounded-md mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
