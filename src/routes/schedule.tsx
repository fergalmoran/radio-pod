import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/schedule')({
  component: SchedulePage,
})

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = [6, 8, 10, 12, 14, 16, 18, 20, 22]

function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Schedule</h1>
        <p className="text-muted-foreground">Weekly programme guide.</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div className="text-xs text-muted-foreground px-2 py-1" />
            {DAYS.map((day) => (
              <div key={day} className="text-xs font-semibold text-center py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="flex flex-col gap-1">
            {SLOTS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 gap-1 items-center">
                <div className="text-xs text-muted-foreground px-2 tabular-nums">
                  {hour}:00
                </div>
                {DAYS.map((day) => (
                  <Skeleton key={day} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
