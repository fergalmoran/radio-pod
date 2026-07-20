import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { OnAirNow } from '../widgets/on-air-now'
import { UpNext } from '../widgets/up-next'
import type { NowPlayingState } from '@/lib/use-now-playing'

type SidebarProps = {
  nowPlaying: NowPlayingState | null
  isPlaying?: boolean
  onTogglePlay?: () => void
  volume?: number
  onVolumeChange?: (volume: number) => void
}

export const Sidebar = ({ nowPlaying, isPlaying, onTogglePlay, volume, onVolumeChange }: SidebarProps) => {
  return (
    <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-6 py-6 px-3 border-r overflow-y-auto bg-sidebar">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
          On Air Now
        </h3>
        <OnAirNow
          nowPlaying={nowPlaying}
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
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
