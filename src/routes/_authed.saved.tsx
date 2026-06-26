import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_authed/saved')({
  component: SavedPage,
})

function SavedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Saved Episodes</h1>
        <p className="text-muted-foreground">Episodes you&apos;ve bookmarked to listen to later.</p>
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
            <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-56 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
