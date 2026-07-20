import { useState } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { NowPlayingState } from '@/lib/use-now-playing'
import { Icons } from '@/components/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { getRole, canEndLive } from '@/lib/roles'
import { stopShow } from '@/server/fns/schedule-fns'
import { endLive } from '@/server/fns/live-fns'
import { Image } from '../images/image'

const fmtTime = (epochMs: number): string => {
  return new Date(epochMs).toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Dublin',
  })
}

type OnAirNowProps = {
  nowPlaying: NowPlayingState | null
  isPlaying?: boolean
  onTogglePlay?: () => void
  volume?: number
  onVolumeChange?: (volume: number) => void
}

export const OnAirNow = ({ nowPlaying, isPlaying, onTogglePlay, volume, onVolumeChange }: OnAirNowProps) => {
  const { session } = useRouteContext({ from: '__root__' })
  const role = getRole(session)
  const isAdmin = role === 'admin'
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [endLiveConfirmOpen, setEndLiveConfirmOpen] = useState(false)

  const stopMutation = useMutation({
    mutationFn: () => stopShow(),
    onSuccess: () => {
      toast.success('Show stopped')
      setConfirmOpen(false)
    },
    onError: () => toast.error('Failed to stop show'),
  })

  const isLive = nowPlaying?.type === 'live'
  const endLiveMutation = useMutation({
    mutationFn: () => endLive({ data: { showId: nowPlaying!.showId! } }),
    onSuccess: () => {
      toast.success('Live stream ended')
      setEndLiveConfirmOpen(false)
    },
    onError: () => toast.error('Failed to end live stream'),
  })

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
  const isOwner = session?.user.id !== undefined && session.user.id === nowPlaying.hostUserId

  return (
    <div className="rounded-lg border bg-card overflow-hidden flex">
      {!isLive && onTogglePlay && (
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-16 w-16 shrink-0 self-center mx-2 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Icons.Pause className="h-6 w-6" /> : <Icons.Play className="h-6 w-6" />}
        </button>
      )}

      <div className="flex flex-col gap-2 min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              {isLive ? 'Live' : isEpisode ? 'On Air' : 'Now Playing'}
            </span>
          </div>
          {hasTiming && (
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
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
              isEpisode || isLive ? 'bg-primary/10' : 'bg-muted',
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

        {onVolumeChange && volume !== undefined && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? (
                <Icons.VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Icons.Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([next]) => onVolumeChange(next)}
              aria-label="Volume"
            />
          </div>
        )}

        {isAdmin && isEpisode && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Icons.Square className="h-3.5 w-3.5" />
                Stop Show
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Stop the current show?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately cut "{nowPlaying.title}" and fall back to station rotation. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={stopMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={stopMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    stopMutation.mutate()
                  }}
                >
                  {stopMutation.isPending ? 'Stopping…' : 'Stop Show'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isLive && canEndLive(role, isOwner) && (
          <AlertDialog open={endLiveConfirmOpen} onOpenChange={setEndLiveConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Icons.Square className="h-3.5 w-3.5" />
                End Live
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End the live stream?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end "{nowPlaying.title}" and fall back to station rotation. The host will need to stop
                  streaming from OBS separately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={endLiveMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={endLiveMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault()
                    endLiveMutation.mutate()
                  }}
                >
                  {endLiveMutation.isPending ? 'Ending…' : 'End Live'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
