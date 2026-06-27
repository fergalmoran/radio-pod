import { useNowPlaying } from '@/lib/use-now-playing'
import { Icons } from '@/components/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Image } from '../images/image'

function fmtTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

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
  const hasTiming = nowPlaying.startsAt !== undefined && nowPlaying.endsAt !== undefined

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isEpisode ? 'On Air' : 'radio'}
          </span>
        </div>
        {hasTiming && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {fmtTime(nowPlaying.startsAt!)} – {fmtTime(nowPlaying.endsAt!)}
          </span>
        )}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm font-medium leading-snug line-clamp-2 cursor-default">
                {nowPlaying.title}
              </p>
            </TooltipTrigger>
            <TooltipContent>{nowPlaying.title}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
