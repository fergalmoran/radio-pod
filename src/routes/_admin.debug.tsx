import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { nowPlayingDebugQueryOptions } from '@/lib/queries'

const fmtTime = (epochMs: number | null | undefined) => {
  if (!epochMs) return '—'
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const fmtRelative = (epochMs: number | null | undefined, now: number) => {
  if (!epochMs) return '—'
  const diffMs = epochMs - now
  const abs = Math.abs(diffMs)
  const mins = Math.round(abs / 60_000)
  const label = mins < 1 ? `${Math.round(abs / 1000)}s` : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  return diffMs >= 0 ? `in ${label}` : `${label} ago`
}

const typeVariant = (type: string): 'default' | 'destructive' | 'secondary' => {
  if (type === 'live') return 'destructive'
  if (type === 'episode') return 'default'
  return 'secondary'
}

const DebugPage = () => {
  const { data, isLoading, error } = useQuery(nowPlayingDebugQueryOptions)

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (error) {
    return <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Failed to load'}</p>
  }

  const now = new Date(data.serverTime).getTime()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Debug: Now Playing</h1>
        <p className="text-muted-foreground text-sm">
          Refreshes every 3s · server time {fmtTime(now)}
        </p>
      </div>

      {/* Current state */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current state</h2>
        {data.nowPlaying ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={typeVariant(data.nowPlaying.type)}>{data.nowPlaying.type}</Badge>
              <span className="font-medium">{data.nowPlaying.title}</span>
              <span className="text-muted-foreground text-sm">— {data.nowPlaying.artist}</span>
            </div>
            <p className="text-sm">
              <span className="text-muted-foreground">Why: </span>
              {data.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              Set at {fmtTime(data.setAt)} ({fmtRelative(data.setAt, now)})
              {data.nowPlaying.startsAt && (
                <> · window {fmtTime(data.nowPlaying.startsAt)} – {fmtTime(data.nowPlaying.endsAt)}</>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No state set yet.</p>
        )}
      </div>

      {/* Guards */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Guards</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Episode expected</p>
            <p>{data.guards.isEpisodeExpected ? 'yes' : 'no'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Episode ends at</p>
            <p>{fmtTime(data.guards.episodeEndsAt)} ({fmtRelative(data.guards.episodeEndsAt, now)})</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Live active</p>
            <p>{data.guards.isLiveActive ? 'yes' : 'no'}</p>
          </div>
        </div>
      </div>

      {/* In-memory scheduled jobs */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Scheduled jobs (in-memory, this server process)
        </h2>
        {data.scheduledJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing armed.</p>
        ) : (
          <div className="space-y-1">
            {data.scheduledJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span>{job.title} <span className="text-muted-foreground">(id {job.id})</span></span>
                <span className="text-muted-foreground tabular-nums">
                  {fmtTime(new Date(job.broadcastAt).getTime())} ({fmtRelative(new Date(job.broadcastAt).getTime(), now)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming shows in DB */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming shows (DB)</h2>
        {data.upcomingShows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None scheduled.</p>
        ) : (
          <div className="space-y-1">
            {data.upcomingShows.map((show) => (
              <div key={show.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span>
                  {show.title} <span className="text-muted-foreground">(id {show.id})</span>
                  {!show.audioUrl && <Badge variant="outline" className="ml-2">no audio</Badge>}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {fmtTime(new Date(show.broadcastAt).getTime())} ({fmtRelative(new Date(show.broadcastAt).getTime(), now)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live / armed shows */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live / armed shows (DB)</h2>
        {data.liveOrArmedShows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None live or armed.</p>
        ) : (
          <div className="space-y-1">
            {data.liveOrArmedShows.map((show) => (
              <div key={show.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span>
                  {show.title} <span className="text-muted-foreground">(id {show.id}, host {show.hostName ?? '—'})</span>
                </span>
                <Badge variant={show.liveStatus === 'live' ? 'destructive' : 'secondary'}>{show.liveStatus}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw */}
      <details className="rounded-xl border bg-card p-4">
        <summary className="text-sm font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer">
          Raw JSON
        </summary>
        <pre className="mt-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}

export const Route = createFileRoute('/_admin/debug')({
  component: DebugPage,
})
