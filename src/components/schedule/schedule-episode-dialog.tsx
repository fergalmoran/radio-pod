import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { createEpisode } from '#/server/fns/schedule-fns'
import { showsForUserQueryOptions } from '#/lib/queries'

type Props = {
  open: boolean
  onClose: () => void
  defaultDate: Date | null
}

function toDatetimeLocal(date: Date | null) {
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function ScheduleEpisodeDialog({ open, onClose, defaultDate }: Props) {
  const queryClient = useQueryClient()
  const { data: shows = [] } = useQuery(showsForUserQueryOptions)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showId, setShowId] = useState('')
  const [broadcastAt, setBroadcastAt] = useState(toDatetimeLocal(defaultDate))
  const [duration, setDuration] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    setBroadcastAt(toDatetimeLocal(defaultDate))
  }, [defaultDate])

  const mutation = useMutation({
    mutationFn: () =>
      createEpisode({
        data: {
          title,
          description: description || undefined,
          showId: showId && showId !== '_none' ? Number(showId) : null,
          broadcastAt: new Date(broadcastAt).toISOString(),
          durationMinutes: duration ? Number(duration) : undefined,
          imageUrl: imageUrl || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      handleClose()
    },
  })

  function handleClose() {
    setTitle('')
    setDescription('')
    setShowId('')
    setBroadcastAt(toDatetimeLocal(defaultDate))
    setDuration('')
    setImageUrl('')
    mutation.reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastAt) return
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule an episode</DialogTitle>
          <DialogDescription>Add a new episode to the broadcast schedule.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ep-title">Title</Label>
            <Input
              id="ep-title"
              placeholder="Episode title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-description">Description</Label>
            <Textarea
              id="ep-description"
              placeholder="What's this episode about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-show">Show</Label>
            <Select value={showId} onValueChange={setShowId}>
              <SelectTrigger id="ep-show">
                <SelectValue placeholder="Standalone (no show)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Standalone (no show)</SelectItem>
                {shows.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ep-broadcast">Broadcast date & time</Label>
              <Input
                id="ep-broadcast"
                type="datetime-local"
                value={broadcastAt}
                onChange={(e) => setBroadcastAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-duration">Duration (minutes)</Label>
              <Input
                id="ep-duration"
                type="number"
                min="1"
                placeholder="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-image">Image URL</Label>
            <Input
              id="ep-image"
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to schedule episode'}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Scheduling...' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
