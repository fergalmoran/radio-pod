import { useState } from 'react'
import { createFileRoute, useNavigate, useRouteContext } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { MonthCalendar } from '@/components/schedule/month-calendar'
import { ScheduleShowDialog } from '@/components/schedule/schedule-show-dialog'
import { showsForMonthQueryOptions } from '@/lib/queries'
import { getRole, canSchedule } from '@/lib/roles'
import { Icons } from '@/components/icons'

const getCurrentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const formatMonthTitle = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })
}

const SchedulePage = () => {
  const { month: monthParam } = Route.useSearch()
  const month = monthParam ?? getCurrentMonth()

  const { session } = useRouteContext({ from: '__root__' })
  const role = getRole(session)
  const userCanSchedule = canSchedule(role)

  const { data: shows } = useSuspenseQuery(showsForMonthQueryOptions(month))

  const navigate = useNavigate({ from: '/schedule' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState<Date | null>(null)
  const [editingShow, setEditingShow] = useState<(typeof shows)[number] | null>(null)

  const goToMonth = (delta: number) => {
    navigate({ search: { month: shiftMonth(month, delta) } })
  }

  const handleSchedule = (date: Date) => {
    setEditingShow(null)
    setDialogDate(date)
    setDialogOpen(true)
  }

  const handleEdit = (show: (typeof shows)[number]) => {
    setEditingShow(show)
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
              Schedule show
            </Button>
          )}
        </div>
      </div>

      <MonthCalendar
        month={month}
        shows={shows}
        canSchedule={userCanSchedule}
        onSchedule={handleSchedule}
        onEdit={handleEdit}
      />

      {!userCanSchedule && (
        <p className="text-xs text-muted-foreground text-center">
          Sign in as an admin, editor, or host to schedule shows.
        </p>
      )}

      {userCanSchedule && (
        <ScheduleShowDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingShow(null) }}
          defaultDate={dialogDate}
          show={editingShow}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/schedule')({
  validateSearch: (search): { month?: string } => ({
    month: typeof search.month === 'string' ? search.month : undefined,
  }),
  loaderDeps: ({ search }) => ({ month: search.month ?? getCurrentMonth() }),
  loader: async ({ deps, context }) => {
    await context.queryClient.ensureQueryData(showsForMonthQueryOptions(deps.month))
  },
  component: SchedulePage,
})
