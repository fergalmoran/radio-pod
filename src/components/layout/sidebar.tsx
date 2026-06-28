import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { OnAirNow } from '../widgets/on-air-now'
import { UpNext } from '../widgets/up-next'
import { Chat } from '../widgets/chat/chat'

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 hidden lg:flex flex-col gap-6 py-6 px-3 border-r overflow-y-auto bg-sidebar">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
          On Air Now
        </h3>
        <OnAirNow />
      </section>

      <Separator />

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
          Up Next
        </h3>
        <Suspense fallback={<Skeleton className="h-16 w-full rounded-lg" />}>
          <UpNext />
        </Suspense>
      </section>
    </aside>
  )
}
