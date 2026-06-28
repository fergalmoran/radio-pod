import { useState } from 'react'
import { createFileRoute, useNavigate, useRouteContext } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { MonthCalendar } from '@/components/schedule/month-calendar'
import { ScheduleEpisodeDialog } from '@/components/schedule/schedule-episode-dialog'
import { episodesForMonthQueryOptions, showsForUserQueryOptions } from '@/lib/queries'
import { getRole, canSchedule } from '@/lib/roles'
import { Icons } from '@/components/icons'

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthTitle(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })
}

export const Route = createFileRoute('/schedule')({
  validateSearch: (search): { month?: string } => ({
    month: typeof search.month === 'string' ? search.month : undefined,
  }),
  loaderDeps: ({ search }) => ({ month: search.month ?? getCurrentMonth() }),
  loader: async ({ deps, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(episodesForMonthQueryOptions(deps.month)),
      context.queryClient.ensureQueryData(showsForUserQueryOptions),
    ])
  },
  component: SchedulePage,
})

function SchedulePage() {
  const { month: monthParam } = Route.useSearch()
  const month = monthParam ?? getCurrentMonth()

  const { session } = useRouteContext({ from: '__root__' })
  const role = getRole(session)
  const userCanSchedule = canSchedule(role)

  const { data: episodes } = useSuspenseQuery(episodesForMonthQueryOptions(month))

  const navigate = useNavigate({ from: '/schedule' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState<Date | null>(null)
  const [editingEpisode, setEditingEpisode] = useState<(typeof episodes)[number] | null>(null)

  function goToMonth(delta: number) {
    navigate({ search: { month: shiftMonth(month, delta) } })
  }

  function handleSchedule(date: Date) {
    setEditingEpisode(null)
    setDialogDate(date)
    setDialogOpen(true)
  }

  function handleEdit(episode: (typeof episodes)[number]) {
    setEditingEpisode(episode)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Schedule</h1>
          <p className="text-muted-foreground text-sm">{formatMonthTitle(month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goToMonth(-1)}>
            <Icons.ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ search: { month: getCurrentMonth() } })}
          >
            This month
          </Button>
          <Button variant="outline" size="icon" onClick={() => goToMonth(1)}>
            <Icons.ChevronRight className="h-4 w-4" />
          </Button>
          {userCanSchedule && (
            <Button size="sm" onClick={() => handleSchedule(new Date())}>
              <Icons.CalendarPlus className="h-4 w-4" />
              Schedule episode
            </Button>
          )}
        </div>
      </div>

      <MonthCalendar
        month={month}
        episodes={episodes}
        canSchedule={userCanSchedule}
        onSchedule={handleSchedule}
        onEdit={handleEdit}
      />

      {!userCanSchedule && (
        <p className="text-xs text-muted-foreground text-center">
          Sign in as an admin, editor, or host to schedule episodes.
        </p>
      )}

      {userCanSchedule && (
        <ScheduleEpisodeDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingEpisode(null) }}
          defaultDate={dialogDate}
          episode={editingEpisode}
        />
      )}
    </div>
  )
}
