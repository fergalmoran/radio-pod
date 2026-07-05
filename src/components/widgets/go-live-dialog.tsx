import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Icons } from '@/components/icons'
import { showsForUserQueryOptions, showLiveInfoQueryOptions } from '@/lib/queries'
import { goLive, endLive } from '@/server/fns/live-fns'
import { createShow } from '@/server/fns/schedule-fns'
import { canEndLive } from '@/lib/roles'
import { useNowPlaying } from '@/lib/use-now-playing'
import type { UserRole } from '@/db/schema'

type GoLiveDialogProps = {
  role: UserRole
  userId: string
}

const NEW_SHOW_VALUE = '_new'

const copyToClipboard = (value: string) => {
  navigator.clipboard.writeText(value)
  toast.success('Copied to clipboard')
}

export const GoLiveDialog = ({ role, userId }: GoLiveDialogProps) => {
  const [open, setOpen] = useState(false)
  const [selection, setSelection] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const queryClient = useQueryClient()
  const nowPlaying = useNowPlaying()

  const showsQuery = useQuery({ ...showsForUserQueryOptions, enabled: open })
  const shows = showsQuery.data ?? []
  const isCreatingNew = selection === NEW_SHOW_VALUE
  const selectedShowId = selection && !isCreatingNew ? Number(selection) : null

  useEffect(() => {
    if (!open) {
      setSelection('')
      setNewTitle('')
      setNewDescription('')
      return
    }
    if (selection) return
    if (shows.length === 1) {
      setSelection(String(shows[0].id))
    } else if (shows.length === 0) {
      setSelection(NEW_SHOW_VALUE)
    }
  }, [open, shows, selection])

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

  const createShowMutation = useMutation({
    mutationFn: () =>
      createShow({
        data: {
          title: newTitle,
          description: newDescription || undefined,
          broadcastAt: new Date().toISOString(),
        },
      }),
    onSuccess: (show) => {
      queryClient.invalidateQueries({ queryKey: ['shows'] })
      setSelection(String(show.id))
    },
    onError: () => toast.error('Failed to create show'),
  })

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
  const isOwner = selectedShow ? selectedShow.hostUserId === userId : true

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
        ) : (
          <div className="space-y-5">
            {shows.length > 0 && (
              <div className="space-y-2">
                <Label>Show</Label>
                <Select value={selection} onValueChange={setSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a show" />
                  </SelectTrigger>
                  <SelectContent>
                    {shows.map((show) => (
                      <SelectItem key={show.id} value={String(show.id)}>
                        {show.title}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_SHOW_VALUE}>+ Start a new show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isCreatingNew ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-show-title">Show name</Label>
                  <Input
                    id="new-show-title"
                    placeholder="e.g. Friday Night Live"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-show-description">Description</Label>
                  <Textarea
                    id="new-show-description"
                    placeholder="What are you playing tonight?"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                {createShowMutation.isError && (
                  <p className="text-sm text-destructive">Failed to create show</p>
                )}
                <Button
                  className="w-full"
                  disabled={!newTitle.trim() || createShowMutation.isPending}
                  onClick={() => createShowMutation.mutate()}
                >
                  {createShowMutation.isPending ? 'Starting...' : 'Start streaming'}
                </Button>
              </div>
            ) : selectedShowId != null ? (
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
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
