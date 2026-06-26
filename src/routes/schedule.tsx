import { useState } from 'react'
import { createFileRoute, useNavigate, useRouteContext } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { WeekCalendar } from '#/components/schedule/week-calendar'
import { ScheduleEpisodeDialog } from '#/components/schedule/schedule-episode-dialog'
import { episodesForWeekQueryOptions, showsForUserQueryOptions } from '#/lib/queries'
import { getRole, canSchedule } from '#/lib/roles'

function getMondayOf(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function formatWeekRange(weekStart: string) {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function shiftWeek(weekStart: string, delta: number) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().slice(0, 10)
}

export const Route = createFileRoute('/schedule')({
  validateSearch: (search): { week?: string } => ({
    week: typeof search.week === 'string' ? search.week : undefined,
  }),
  loaderDeps: ({ search }) => ({ week: search.week ?? getMondayOf() }),
  loader: async ({ deps, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(episodesForWeekQueryOptions(deps.week)),
      context.queryClient.ensureQueryData(showsForUserQueryOptions),
    ])
  },
  component: SchedulePage,
})

function SchedulePage() {
  const { week: weekParam } = Route.useSearch()
  const week = weekParam ?? getMondayOf()

  const { session } = useRouteContext({ from: '__root__' })
  const role = getRole(session)
  const userCanSchedule = canSchedule(role)

  const { data: episodes } = useSuspenseQuery(episodesForWeekQueryOptions(week))

  const navigate = useNavigate({ from: '/schedule' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState<Date | null>(null)

  const weekStart = new Date(week)

  function goToWeek(delta: number) {
    navigate({ search: { week: shiftWeek(week, delta) } })
  }

  function handleSchedule(date: Date) {
    setDialogDate(date)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Schedule</h1>
          <p className="text-muted-foreground text-sm">{formatWeekRange(week)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goToWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ search: { week: getMondayOf() } })}
          >
            This week
          </Button>
          <Button variant="outline" size="icon" onClick={() => goToWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {userCanSchedule && (
            <Button size="sm" onClick={() => handleSchedule(new Date())}>
              <CalendarPlus className="h-4 w-4" />
              Schedule episode
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <WeekCalendar
            weekStart={weekStart}
            episodes={episodes}
            canSchedule={userCanSchedule}
            onSchedule={handleSchedule}
          />
        </div>
      </div>

      {!userCanSchedule && (
        <p className="text-xs text-muted-foreground text-center">
          Sign in as an admin, editor, or host to schedule episodes.
        </p>
      )}

      {userCanSchedule && (
        <ScheduleEpisodeDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          defaultDate={dialogDate}
        />
      )}
    </div>
  )
}
