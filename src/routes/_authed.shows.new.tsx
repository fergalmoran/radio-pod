import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { createShow } from '#/server/fns/shows-fns'
import { getRole, canCreateShow } from '#/lib/roles'

export const Route = createFileRoute('/_authed/shows/new')({
  beforeLoad: ({ context }) => {
    const role = getRole(context.session)
    if (!canCreateShow(role)) throw redirect({ to: '/' })
  },
  component: NewShowPage,
})

function NewShowPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [hostName, setHostName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const { session } = Route.useRouteContext()
  const role = getRole(session)
  const isEditor = role === 'admin' || role === 'editor'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await createShow({
        data: {
          title,
          description: description || undefined,
          imageUrl: imageUrl || undefined,
          hostName: isEditor && hostName ? hostName : undefined,
        },
      })
      navigate({ to: '/shows' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create show')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4"
          onClick={() => navigate({ to: '/shows' })}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shows
        </Button>
        <h1 className="text-2xl font-bold mb-1">Create a show</h1>
        <p className="text-muted-foreground text-sm">Add a new programme to the schedule.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="show-title">Title</Label>
          <Input
            id="show-title"
            placeholder="e.g. Morning Drive"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="show-description">Description</Label>
          <Textarea
            id="show-description"
            placeholder="Tell listeners what this show is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="show-image">Image URL</Label>
          <Input
            id="show-image"
            type="url"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Show preview"
              className="mt-2 h-24 w-24 rounded-lg object-cover border"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
        </div>

        {isEditor && (
          <div className="space-y-2">
            <Label htmlFor="show-host">Host name</Label>
            <Input
              id="show-host"
              placeholder="Leave blank to use your account name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/shows' })}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create show'}
          </Button>
        </div>
      </form>
    </div>
  )
}
