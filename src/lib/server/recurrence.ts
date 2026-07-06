import '@tanstack/react-start/server-only'
import type { ShowRecurrence } from '@/db/schema'

// How far ahead recurring shows get materialized into real `shows` rows.
export const MATERIALIZE_HORIZON_DAYS = 120

export const addInterval = (date: Date, recurrence: 'weekly' | 'monthly'): Date => {
  if (recurrence === 'weekly') {
    const next = new Date(date)
    next.setDate(next.getDate() + 7)
    return next
  }

  const day = date.getDate()
  const next = new Date(date)
  next.setDate(1)
  next.setMonth(next.getMonth() + 1)
  const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDayOfNextMonth))
  return next
}

/** All occurrence dates for a show from `anchor` out to the materialize horizon,
 *  including `anchor` itself. A one-off show is just `[anchor]`. */
export const generateOccurrenceDates = (
  anchor: Date,
  recurrence: ShowRecurrence,
  horizonDays = MATERIALIZE_HORIZON_DAYS,
): Date[] => {
  if (recurrence === 'once') return [anchor]

  const horizon = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000)
  const dates = [anchor]
  let cursor = anchor
  while (true) {
    cursor = addInterval(cursor, recurrence)
    if (cursor > horizon) break
    dates.push(cursor)
  }
  return dates
}
