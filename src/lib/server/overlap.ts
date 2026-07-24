import '@tanstack/react-start/server-only'
import { db } from '@/db'
import { shows } from '@/db/schema'
import type { Show } from '@/db/schema'

// Matches the scheduler's assumption for shows with no explicit duration set.
const DEFAULT_DURATION_SECONDS = 3600

const rangeEnd = (start: Date, durationSeconds: number | null): number =>
  start.getTime() + (durationSeconds ?? DEFAULT_DURATION_SECONDS) * 1000

export type OverlapCandidate = { start: Date; durationSeconds: number | null }
export type OverlapConflict = { show: Show; candidateStart: Date }

/**
 * Finds the first existing show whose broadcast range intersects any of
 * `candidates`. Pass `excludeShowId`/`excludeSeriesId` to ignore the show (or
 * whole series) being created/edited so it doesn't conflict with itself.
 */
export const findOverlapConflict = async (
  candidates: OverlapCandidate[],
  options: { excludeShowId?: string; excludeSeriesId?: string | null } = {},
): Promise<OverlapConflict | null> => {
  if (candidates.length === 0) return null

  const rows = await db.select().from(shows)

  for (const candidate of candidates) {
    const candidateStart = candidate.start.getTime()
    const candidateEnd = rangeEnd(candidate.start, candidate.durationSeconds)

    for (const row of rows) {
      if (row.id === options.excludeShowId) continue
      if (options.excludeSeriesId != null && row.seriesId === options.excludeSeriesId) continue

      const rowStart = row.broadcastAt.getTime()
      const rowEnd = rangeEnd(row.broadcastAt, row.durationSeconds)

      if (candidateStart < rowEnd && rowStart < candidateEnd) {
        return { show: row, candidateStart: candidate.start }
      }
    }
  }

  return null
}
