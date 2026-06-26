import { Play, SkipBack, SkipForward, Volume2, Heart } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'

export function PlayerBar() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Now playing info */}
        <div className="flex items-center gap-3 w-56 shrink-0">
          <Skeleton className="h-10 w-10 rounded-md shrink-0" />
          <div className="flex flex-col gap-1 min-w-0">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label="Favorite">
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Playback controls */}
        <div className="flex items-center gap-1 mx-auto">
          <Button variant="ghost" size="icon-sm" aria-label="Previous">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" aria-label="Play / Pause">
            <Play className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Volume */}
        <div className="flex items-center gap-2 w-36 shrink-0 ml-auto">
          <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </footer>
  )
}
