import { useNowPlaying } from '@/lib/use-now-playing'
import { Icons } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { Image } from '../images/image'
export function OnAirNow() {
  const nowPlaying = useNowPlaying()

  if (!nowPlaying) {
    return (
      <div className="px-2 py-3 rounded-lg bg-muted/40 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
        Connecting…
      </div>
    )
  }

  const isEpisode = nowPlaying.type === 'episode'

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isEpisode ? 'On Air' : 'Auto DJ'}
        </span>
      </div>

      {/* Track row */}
      <div className="flex items-center gap-2.5">
        {nowPlaying.imageUrl ? (
          <Image
            src={nowPlaying.imageUrl}
            alt=""
            className="h-10 w-10 rounded-md object-cover shrink-0"
          />
        ) : (
          <div className={cn(
            'h-10 w-10 rounded-md flex items-center justify-center shrink-0',
            isEpisode ? 'bg-primary/10' : 'bg-muted',
          )}>
            <Icons.Radio className="h-5 w-5 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">
            {nowPlaying.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {nowPlaying.artist}
          </p>
        </div>
      </div>
    </div>
  )
}
