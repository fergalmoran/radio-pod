import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/images/image'
import { Icons } from '@/components/icons'
import { finishedShowsQueryOptions } from '@/lib/queries'
import { useSiteSettings } from '@/lib/use-site-settings'

const ListenBackPage = () => {
  const { data: episodes } = useSuspenseQuery(finishedShowsQueryOptions)
  const settings = useSiteSettings()
  const [playingId, setPlayingId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Listen Back</h1>
        <p className="text-muted-foreground">Catch up on past episodes of {settings.name}.</p>
      </div>

      {episodes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No episodes archived yet — check back after a show airs.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {episodes.map((episode) => {
            const isPlaying = playingId === episode.id
            return (
              <div key={episode.id} className="flex flex-col gap-3 p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-4">
                  {episode.imageUrl ? (
                    <Image
                      src={episode.imageUrl}
                      alt={episode.title}
                      className="h-16 w-16 shrink-0 border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted shrink-0 flex items-center justify-center text-xl font-bold text-muted-foreground select-none">
                      {episode.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{episode.title}</p>
                    {episode.hostName && (
                      <p className="text-xs text-muted-foreground truncate">{episode.hostName}</p>
                    )}
                    {episode.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{episode.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Icons.Calendar className="h-3 w-3" />
                      {format(new Date(episode.broadcastAt), 'MMM d, yyyy')}
                    </p>
                    <Button
                      variant={isPlaying ? 'secondary' : 'outline'}
                      size="icon"
                      className="rounded-full"
                      aria-label={isPlaying ? 'Hide player' : `Play ${episode.title}`}
                      onClick={() => setPlayingId(isPlaying ? null : episode.id)}
                    >
                      {isPlaying ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {isPlaying && episode.audioUrl && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio
                    src={episode.audioUrl}
                    controls
                    autoPlay
                    className="w-full h-10"
                    onEnded={() => setPlayingId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/listen-back')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(finishedShowsQueryOptions)
  },
  component: ListenBackPage,
})
