import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="space-y-10">
      {/* Live stream hero */}
      <section className="rounded-2xl border bg-card p-8 flex flex-col gap-6">
        <div className="flex items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <Skeleton className="h-7 w-64 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
      </section>

      {/* Recent episodes */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Episodes</h2>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
              <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-3 w-full rounded" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-4 w-10 rounded" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shows */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Our Shows</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square rounded-xl w-full" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
