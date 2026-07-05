import { useSuspenseQuery } from '@tanstack/react-query'
import { upNextQueryOptions } from '@/lib/queries'
import { Icons } from '@/components/icons'
import { Image } from '../images/image'

const formatRelative = (date: Date): string => {
  const diffMs = date.getTime() - Date.now()
  const diffMins = Math.round(diffMs / 60_000)
  if (diffMins < 60) return `in ${diffMins}m`
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60
  return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`
}

export const UpNext = () => {
  const { data: show } = useSuspenseQuery(upNextQueryOptions)

  if (!show) {
    return (
      <div className="px-2 py-3 rounded-lg bg-muted/40 flex items-center gap-2 text-xs text-muted-foreground">
        <Icons.Radio className="h-3.5 w-3.5 shrink-0" />
        No shows currently scheduled
      </div>
    )
  }

  const broadcastAt = new Date(show.broadcastAt)

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {show.hostName ?? 'Up Next'}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatRelative(broadcastAt)}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {show.imageUrl ? (
          <Image
            src={show.imageUrl}
            alt=""
            className="h-10 w-10 rounded-md object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Icons.Radio className="h-5 w-5 text-muted-foreground/50" />
          </div>
        )}

        <p className="text-sm font-medium leading-snug line-clamp-2">
          {show.title}
        </p>
      </div>
    </div>
  )
}
