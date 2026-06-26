import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 hidden lg:flex flex-col gap-6 py-6 px-3 border-r min-h-full bg-sidebar">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
          On Air Now
        </h3>
        <div className="flex flex-col gap-2 px-2">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
          Up Next
        </h3>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
          Recent Episodes
        </h3>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-4/5 rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </section>
    </aside>
  )
}
