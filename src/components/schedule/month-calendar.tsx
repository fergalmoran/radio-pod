import { cn } from '@/lib/utils'
import { Icons } from '../icons'
import type { ShowRecurrence } from '@/db/schema'

type ShowOccurrence = {
  id: number
  title: string
  description: string | null
  audioUrl: string | null
  imageUrl: string | null
  broadcastAt: Date
  durationSeconds: number | null
  hostName: string | null
  hostUserId: string | null
  recurrence: ShowRecurrence
  seriesId: number | null
}

type Props = {
  month: string // "YYYY-MM"
  shows: ShowOccurrence[]
  canSchedule: boolean
  onSchedule: (date: Date) => void
  onEdit: (show: ShowOccurrence) => void
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_VISIBLE = 3
const CALENDAR_TZ = 'Europe/Dublin'

const formatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CALENDAR_TZ,
  })
}

// Buckets a show under the calendar day it falls on in station-local
// (Dublin) time. Using Date's local getters here would bucket by whatever
// timezone the runtime happens to be in — which can differ between the SSR
// process and the browser — and shows broadcasting near midnight would land
// on a different day cell on each side, causing a hydration mismatch.
const dublinDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALENDAR_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dublinDateKey = (date: Date | string) => dublinDateKeyFormatter.format(new Date(date))

const cellDateKey = (year: number, monthNum: number, dayNum: number) =>
  `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

export const MonthCalendar = ({ month, shows, canSchedule, onSchedule, onEdit }: Props) => {
  const [year, monthNum] = month.split('-').map(Number)
  const todayKey = dublinDateKey(new Date())

  const firstDay = new Date(year, monthNum - 1, 1)
  const daysInMonth = new Date(year, monthNum, 0).getDate()

  // Monday-first offset: Mon=0 … Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1
    const date = new Date(year, monthNum - 1, dayNum)
    const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
    const dayKey = isCurrentMonth ? cellDateKey(year, monthNum, dayNum) : null
    const isToday = dayKey === todayKey
    const dayShows = dayKey ? shows.filter((s) => dublinDateKey(s.broadcastAt) === dayKey) : []
    return { date, isCurrentMonth, isToday, dayShows }
  })

  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="divide-y">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x">
            {week.map(({ date, isCurrentMonth, isToday, dayShows }, di) => (
              <div
                key={di}
                className={cn(
                  'relative group flex flex-col min-h-[110px] p-1.5 transition-colors',
                  !isCurrentMonth && 'bg-muted/20',
                  canSchedule && isCurrentMonth && 'cursor-pointer hover:bg-accent/40',
                )}
                onClick={() => {
                  if (!canSchedule || !isCurrentMonth) return
                  const d = new Date(date)
                  d.setHours(10, 0, 0, 0)
                  onSchedule(d)
                }}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/40',
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {canSchedule && isCurrentMonth && (
                    <Icons.Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </div>

                {/* Shows */}
                <div className="flex flex-col gap-0.5">
                  {dayShows.slice(0, MAX_VISIBLE).map((s) => (
                    <div
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); if (canSchedule) onEdit(s) }}
                      className={cn(
                        'flex items-baseline gap-1 rounded px-1.5 py-0.5 bg-primary/15 hover:bg-primary/25 transition-colors',
                        canSchedule ? 'cursor-pointer' : 'cursor-default',
                      )}
                    >
                      <span className="text-[10px] font-semibold text-primary shrink-0 tabular-nums">
                        {formatTime(s.broadcastAt)}
                      </span>
                      <span className="text-[10px] text-foreground/80 truncate">{s.title}</span>
                      {s.recurrence !== 'once' && (
                        <Icons.Repeat className="h-2.5 w-2.5 text-primary/70 shrink-0" />
                      )}
                    </div>
                  ))}
                  {dayShows.length > MAX_VISIBLE && (
                    <p className="text-[10px] text-muted-foreground pl-1">
                      +{dayShows.length - MAX_VISIBLE} more
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
