import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { showsQueryOptions } from '#/lib/queries'
import { getRole, canCreateShow } from '#/lib/roles'

export const Route = createFileRoute('/shows')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(showsQueryOptions)
    return { canCreate: canCreateShow(getRole(context.session)) }
  },
  component: ShowsPage,
})

function ShowsPage() {
  const { canCreate } = Route.useLoaderData()
  const { data: shows } = useSuspenseQuery(showsQueryOptions)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Shows</h1>
          <p className="text-muted-foreground">All programmes on radio-pod.</p>
        </div>
        {canCreate && (
          <Button asChild size="sm">
            <Link to="/shows/new">
              <Plus className="h-4 w-4" />
              New show
            </Link>
          </Button>
        )}
      </div>

      {shows.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No shows yet.</p>
          {canCreate && (
            <Button asChild size="sm" className="mt-4">
              <Link to="/shows/new">Create the first show</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shows.map((show) => (
            <div key={show.id} className="flex gap-4 items-start p-4 rounded-xl border bg-card">
              {show.imageUrl ? (
                <img
                  src={show.imageUrl}
                  alt={show.title}
                  className="h-20 w-20 rounded-lg object-cover shrink-0 border"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted shrink-0 flex items-center justify-center text-2xl font-bold text-muted-foreground select-none">
                  {show.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{show.title}</p>
                {show.hostName && (
                  <p className="text-xs text-muted-foreground">{show.hostName}</p>
                )}
                {show.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {show.description}
                  </p>
                )}
                <Button variant="outline" size="sm" className="mt-2 w-fit" disabled>
                  Listen back
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
