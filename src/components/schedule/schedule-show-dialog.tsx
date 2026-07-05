import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Progress } from '@/components/ui/progress'
import { createShow, updateShow } from '@/server/fns/schedule-fns'

type ShowOccurrence = {
  id: number
  title: string
  description: string | null
  broadcastAt: Date | string
  durationSeconds: number | null
  imageUrl: string | null
  audioUrl: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  defaultDate: Date | null
  show?: ShowOccurrence | null
}

const toDatetimeLocal = (date: Date | string | null) => {
  if (!date) return ''
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const ScheduleShowDialog = ({ open, onClose, defaultDate, show }: Props) => {
  const queryClient = useQueryClient()
  const isEditing = !!show

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [broadcastAt, setBroadcastAt] = useState('')
  const [duration, setDuration] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [audioUploading, setAudioUploading] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [imageUploading, setImageUploading] = useState(false)

  useEffect(() => {
    if (show) {
      setTitle(show.title)
      setDescription(show.description ?? '')
      setBroadcastAt(toDatetimeLocal(show.broadcastAt))
      setDuration(show.durationSeconds ? String(show.durationSeconds / 60) : '')
      setImageUrl(show.imageUrl ?? '')
      setAudioUrl(show.audioUrl ?? '')
    } else {
      setTitle('')
      setDescription('')
      setBroadcastAt(toDatetimeLocal(defaultDate))
      setDuration('')
      setImageUrl('')
      setAudioUrl('')
    }
    setAudioUploading(false)
    setAudioProgress(0)
    setImageUploading(false)
  }, [show, defaultDate, open])

  const uploadFileWithProgress = (
    file: File,
    type: 'audio' | 'image',
    onProgress?: (pct: number) => void,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload')
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { url } = JSON.parse(xhr.responseText) as { url: string }
          resolve(url)
        } else {
          reject(new Error(xhr.responseText))
        }
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(formData)
    })
  }

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioUploading(true)
    setAudioProgress(0)
    try {
      setAudioUrl(await uploadFileWithProgress(file, 'audio', setAudioProgress))
    } finally {
      setAudioUploading(false)
      setAudioProgress(0)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      setImageUrl(await uploadFileWithProgress(file, 'image'))
    } finally {
      setImageUploading(false)
    }
  }

  const sharedData = () => ({
    title,
    description: description || undefined,
    broadcastAt: new Date(broadcastAt).toISOString(),
    durationMinutes: duration ? Number(duration) : undefined,
    imageUrl: imageUrl || undefined,
    audioUrl: audioUrl || undefined,
  })

  const createMutation = useMutation({
    mutationFn: () => createShow({ data: sharedData() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shows'] }); handleClose() },
  })

  const updateMutation = useMutation({
    mutationFn: () => updateShow({ data: { id: show!.id, ...sharedData() } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shows'] }); handleClose() },
  })

  const mutation = isEditing ? updateMutation : createMutation

  const handleClose = () => {
    mutation.reset()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastAt) return
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit show' : 'Schedule a show'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this show.' : 'Add a new show to the broadcast schedule.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="show-title">Title</Label>
            <Input
              id="show-title"
              placeholder="Show title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="show-description">Description</Label>
            <Textarea
              id="show-description"
              placeholder="What's this show about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="show-broadcast">Broadcast date & time</Label>
              <Input
                id="show-broadcast"
                type="datetime-local"
                value={broadcastAt}
                onChange={(e) => setBroadcastAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="show-duration">Duration (minutes)</Label>
              <Input
                id="show-duration"
                type="number"
                min="1"
                placeholder="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="show-audio">Audio file</Label>
            <Input
              id="show-audio"
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              disabled={audioUploading}
            />
            {audioUploading && (
              <div className="space-y-1">
                <Progress value={audioProgress} />
                <p className="text-xs text-muted-foreground">{audioProgress < 100 ? `Uploading… ${audioProgress}%` : 'Processing…'}</p>
              </div>
            )}
            {audioUrl && !audioUploading && (
              <p className="text-xs text-muted-foreground truncate">{audioUrl.split('/').pop()}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="show-image">Show image</Label>
            <Input
              id="show-image"
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
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save show'}
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
