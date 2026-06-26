import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createEpisode, updateEpisode } from '@/server/fns/schedule-fns'
import { showsForUserQueryOptions } from '@/lib/queries'

type Episode = {
  id: number
  title: string
  description: string | null
  showId: number | null
  broadcastAt: Date | string
  durationSeconds: number | null
  imageUrl: string | null
  audioUrl: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  defaultDate: Date | null
  episode?: Episode | null
}

function toDatetimeLocal(date: Date | string | null) {
  if (!date) return ''
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ScheduleEpisodeDialog({ open, onClose, defaultDate, episode }: Props) {
  const queryClient = useQueryClient()
  const { data: shows = [] } = useQuery(showsForUserQueryOptions)
  const isEditing = !!episode

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showId, setShowId] = useState('')
  const [broadcastAt, setBroadcastAt] = useState('')
  const [duration, setDuration] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [audioUploading, setAudioUploading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)

  useEffect(() => {
    if (episode) {
      setTitle(episode.title)
      setDescription(episode.description ?? '')
      setShowId(episode.showId ? String(episode.showId) : '_none')
      setBroadcastAt(toDatetimeLocal(episode.broadcastAt))
      setDuration(episode.durationSeconds ? String(episode.durationSeconds / 60) : '')
      setImageUrl(episode.imageUrl ?? '')
      setAudioUrl(episode.audioUrl ?? '')
    } else {
      setTitle('')
      setDescription('')
      setShowId('')
      setBroadcastAt(toDatetimeLocal(defaultDate))
      setDuration('')
      setImageUrl('')
      setAudioUrl('')
    }
    setAudioUploading(false)
    setImageUploading(false)
  }, [episode, defaultDate, open])

  async function uploadFile(file: File, type: 'audio' | 'image'): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error(await res.text())
    const { url } = await res.json() as { url: string }
    return url
  }

  async function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioUploading(true)
    try {
      setAudioUrl(await uploadFile(file, 'audio'))
    } finally {
      setAudioUploading(false)
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      setImageUrl(await uploadFile(file, 'image'))
    } finally {
      setImageUploading(false)
    }
  }

  const sharedData = () => ({
    title,
    description: description || undefined,
    showId: showId && showId !== '_none' ? Number(showId) : null,
    broadcastAt: new Date(broadcastAt).toISOString(),
    durationMinutes: duration ? Number(duration) : undefined,
    imageUrl: imageUrl || undefined,
    audioUrl: audioUrl || undefined,
  })

  const createMutation = useMutation({
    mutationFn: () => createEpisode({ data: sharedData() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['episodes'] }); handleClose() },
  })

  const updateMutation = useMutation({
    mutationFn: () => updateEpisode({ data: { id: episode!.id, ...sharedData() } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['episodes'] }); handleClose() },
  })

  const mutation = isEditing ? updateMutation : createMutation

  function handleClose() {
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
          <DialogTitle>{isEditing ? 'Edit episode' : 'Schedule an episode'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this episode.' : 'Add a new episode to the broadcast schedule.'}
          </DialogDescription>
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
            <Label htmlFor="ep-audio">Audio file</Label>
            <Input
              id="ep-audio"
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              disabled={audioUploading}
            />
            {audioUploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {audioUrl && !audioUploading && (
              <p className="text-xs text-muted-foreground truncate">{audioUrl.split('/').pop()}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-image">Episode image</Label>
            <Input
              id="ep-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={imageUploading}
            />
            {imageUploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {imageUrl && !imageUploading && (
              <p className="text-xs text-muted-foreground truncate">{imageUrl.split('/').pop()}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save episode'}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || audioUploading || imageUploading}>
              {mutation.isPending ? 'Saving...' : isEditing ? 'Save changes' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
