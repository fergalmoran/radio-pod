import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

type Episode = {
  id: number
  title: string
  broadcastAt: Date | string
  durationSeconds: number | null
  showTitle: string | null
}

type Props = {
  weekStart: Date
  episodes: Episode[]
  canSchedule: boolean
  onSchedule: (date: Date) => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date | string, b: Date) {
  const da = new Date(a)
  return (
    da.getFullYear() === b.getFullYear() &&
    da.getMonth() === b.getMonth() &&
    da.getDate() === b.getDate()
  )
}

export function WeekCalendar({ weekStart, episodes, canSchedule, onSchedule }: Props) {
  const today = new Date()

  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border">
      {DAYS.map((dayName, i) => {
        const day = addDays(weekStart, i)
        const isToday = isSameDay(today, day)
        const dayEpisodes = episodes.filter((e) => isSameDay(e.broadcastAt, day))

        return (
          <div key={dayName} className="bg-background flex flex-col min-h-[320px]">
            {/* Day header */}
            <div
              className={cn(
                'px-3 py-2 text-center border-b',
                isToday && 'bg-primary/10',
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {dayName}
              </p>
              <p
                className={cn(
                  'text-sm font-semibold mt-0.5',
                  isToday && 'text-primary',
                )}
              >
                {day.getDate()}
              </p>
            </div>

            {/* Episodes */}
            <div className="flex flex-col gap-1 p-1.5 flex-1">
              {dayEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  className="rounded-md bg-primary/10 border border-primary/20 px-2 py-1.5 text-xs cursor-default hover:bg-primary/15 transition-colors"
                >
                  <p className="font-medium truncate">{ep.title}</p>
                  <p className="text-muted-foreground">{formatTime(ep.broadcastAt)}</p>
                  {ep.showTitle && (
                    <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">
                      {ep.showTitle}
                    </Badge>
                  )}
                  {ep.durationSeconds && (
                    <p className="text-muted-foreground mt-0.5">
                      {formatDuration(ep.durationSeconds)}
                    </p>
                  )}
                </div>
              ))}

              {canSchedule && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mt-auto self-end opacity-40 hover:opacity-100"
                  onClick={() => {
                    const d = new Date(day)
                    d.setHours(10, 0, 0, 0)
                    onSchedule(d)
                  }}
                  aria-label={`Schedule episode on ${dayName}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
