import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Icons } from '@/components/icons'
import { showsForUserQueryOptions, showLiveInfoQueryOptions } from '@/lib/queries'
import { goLive, endLive } from '@/server/fns/live-fns'
import { canEndLive } from '@/lib/roles'
import { useNowPlaying } from '@/lib/use-now-playing'
import type { UserRole } from '@/db/schema'

type GoLiveDialogProps = {
  role: UserRole
  userId: string
}

const copyToClipboard = (value: string) => {
  navigator.clipboard.writeText(value)
  toast.success('Copied to clipboard')
}

export const GoLiveDialog = ({ role, userId }: GoLiveDialogProps) => {
  const [open, setOpen] = useState(false)
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const nowPlaying = useNowPlaying()

  const showsQuery = useQuery({ ...showsForUserQueryOptions, enabled: open })
  const shows = showsQuery.data ?? []

  useEffect(() => {
    if (!open) {
      setSelectedShowId(null)
      return
    }
    if (shows.length === 1 && selectedShowId == null) {
      setSelectedShowId(shows[0].id)
    }
  }, [open, shows, selectedShowId])

  const liveInfoQuery = useQuery({
    ...showLiveInfoQueryOptions(selectedShowId ?? -1),
    enabled: selectedShowId != null,
  })

  const goLiveMutation = useMutation({
    mutationFn: (showId: number) => goLive({ data: { showId } }),
    onSuccess: (_data, showId) => {
      queryClient.invalidateQueries({ queryKey: ['live', showId] })
    },
    onError: () => toast.error('Failed to start live stream'),
  })

  useEffect(() => {
    if (selectedShowId != null) {
      goLiveMutation.mutate(selectedShowId)
    }
    // Only re-run when the selected show changes — goLive is idempotent (reuses
    // an existing stream key), so this is safe to fire once per selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShowId])

  const endLiveMutation = useMutation({
    mutationFn: (showId: number) => endLive({ data: { showId } }),
    onSuccess: (_data, showId) => {
      toast.success('Live stream ended')
      queryClient.invalidateQueries({ queryKey: ['live', showId] })
    },
    onError: () => toast.error('Failed to end live stream'),
  })

  const selectedShow = shows.find((show) => show.id === selectedShowId)
  const streamKey = liveInfoQuery.data?.streamKey ?? goLiveMutation.data?.streamKey
  const rtmpUrl = liveInfoQuery.data?.rtmpUrl ?? goLiveMutation.data?.rtmpUrl
  const isLive =
    (nowPlaying?.type === 'live' && nowPlaying.showId === selectedShowId) ||
    liveInfoQuery.data?.liveStatus === 'live'
  const isOwner = selectedShow?.hostUserId === userId

  // Close the dialog as soon as the site picks up the OBS stream for this show.
  useEffect(() => {
    if (open && nowPlaying?.type === 'live' && nowPlaying.showId === selectedShowId) {
      setOpen(false)
      toast.success('You are now live!')
    }
  }, [open, nowPlaying, selectedShowId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icons.Video className="h-4 w-4" />
          Go Live
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Go live</DialogTitle>
          <DialogDescription>
            Configure OBS with the details below, then start streaming.
          </DialogDescription>
        </DialogHeader>

        {showsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your shows...</p>
        ) : shows.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You don't have a show to go live with yet.
            </p>
            <Button asChild size="sm" onClick={() => setOpen(false)}>
              <Link to="/shows/new">Create a show</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {shows.length > 1 && (
              <div className="space-y-2">
                <Label>Show</Label>
                <Select
                  value={selectedShowId != null ? String(selectedShowId) : undefined}
                  onValueChange={(value) => setSelectedShowId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a show" />
                  </SelectTrigger>
                  <SelectContent>
                    {shows.map((show) => (
                      <SelectItem key={show.id} value={String(show.id)}>
                        {show.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedShowId != null && (
              streamKey && rtmpUrl ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`h-2 w-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/40'}`}
                    />
                    {isLive ? 'Currently live' : 'Offline — waiting for OBS to connect'}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rtmp-url">Server (RTMP URL)</Label>
                    <div className="flex gap-2">
                      <Input id="rtmp-url" readOnly value={rtmpUrl} />
                      <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(rtmpUrl)}>
                        <Icons.Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stream-key">Stream key</Label>
                    <div className="flex gap-2">
                      <Input id="stream-key" readOnly value={streamKey} />
                      <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(streamKey)}>
                        <Icons.Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Paste these into OBS's Stream settings. Once OBS starts publishing, this show goes live
                    on the site automatically.
                  </p>

                  {isLive && canEndLive(role, isOwner) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={endLiveMutation.isPending}
                      onClick={() => endLiveMutation.mutate(selectedShowId)}
                    >
                      <Icons.Square className="h-3.5 w-3.5" />
                      {endLiveMutation.isPending ? 'Ending…' : 'End Live'}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Setting up...</p>
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
