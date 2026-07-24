import '@tanstack/react-start/server-only'
import { eq, ne, and, gte, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { shows } from '@/db/schema'
import { generateOccurrenceDates } from './recurrence'
import { upsertKaclShow, deleteKaclShow } from './kacl-shows-client'

/** Tops up future occurrences for one recurring series, up to the horizon. */
export const materializeSeries = async (seriesId: string): Promise<void> => {
  const rows = await db.select().from(shows).where(eq(shows.seriesId, seriesId))
  if (rows.length === 0) return

  const template = rows.reduce((latest, row) =>
    row.broadcastAt > latest.broadcastAt ? row : latest,
  )

  if (template.recurrence === 'once') return

  // First date is the template itself (already a row) — only materialize the rest.
  const futureDates = generateOccurrenceDates(template.broadcastAt, template.recurrence).slice(1)
  const newRows: (typeof shows.$inferInsert)[] = futureDates.map((broadcastAt) => ({
    title: template.title,
    description: template.description,
    hostName: template.hostName,
    hostUserId: template.hostUserId,
    imageUrl: template.imageUrl,
    audioUrl: template.audioUrl,
    broadcastAt,
    durationSeconds: template.durationSeconds,
    recurrence: template.recurrence,
    seriesId: template.seriesId,
  }))

  if (newRows.length === 0) return

  const created = await db.insert(shows).values(newRows).returning()
  for (const show of created) void upsertKaclShow(show)
}

/** Runs materializeSeries for every recurring series that has any row. */
export const materializeAllSeries = async (): Promise<void> => {
  const rows = await db
    .select({ seriesId: shows.seriesId })
    .from(shows)
    .where(ne(shows.recurrence, 'once'))

  const seriesIds = new Set(rows.map((r) => r.seriesId).filter((id): id is string => id !== null))
  for (const seriesId of seriesIds) {
    await materializeSeries(seriesId)
  }
}

/**
 * Cancels and deletes occurrences in `seriesId` from `fromDate` onward
 * (inclusive), optionally excluding one row id (e.g. the one being edited,
 * which is updated separately rather than deleted).
 */
export const deleteSeriesFrom = async (
  seriesId: string,
  fromDate: Date,
  excludeId?: string,
): Promise<void> => {
  const toDelete = await db
    .select({ id: shows.id })
    .from(shows)
    .where(and(eq(shows.seriesId, seriesId), gte(shows.broadcastAt, fromDate)))

  const ids = toDelete.map((r) => r.id).filter((id) => id !== excludeId)
  if (ids.length === 0) return

  await db.delete(shows).where(inArray(shows.id, ids))
  for (const id of ids) void deleteKaclShow(id)
}
