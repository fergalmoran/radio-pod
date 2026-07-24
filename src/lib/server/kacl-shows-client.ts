import '@tanstack/react-start/server-only'
import { join } from 'node:path'
import type { Show } from '@/db/schema'
import { kaclUrl, controlHeaders } from './kacl-client'

const buildAudioPath = (audioUrl: string): string => {
  const filename = audioUrl.replace(/^\/api\/media\/audio\//, '')
  const audioDir = process.env.AUDIO_DIR ?? '/mnt/audio/shows'
  return join(audioDir, filename)
}

/** Upserts a show into kacl's own scheduler — kacl (Quartz-backed) is the
 *  source of truth for playout timing; this just keeps it in sync with
 *  Postgres, which stays the source of truth for the show's content (title,
 *  host, image, audio file). `show.id` is used directly as kacl's own show
 *  ID, so there's no separate mapping to maintain.
 *
 *  No-ops (never calls kacl) if the show has no audio yet — kacl can't play
 *  what doesn't exist, and shows without audio are live-only (driven by
 *  MediaMTX/OBS, not kacl). */
export const upsertKaclShow = async (show: Show): Promise<void> => {
  if (!show.audioUrl) return

  const durationSeconds = show.durationSeconds ?? 3600
  const startsAt = show.broadcastAt
  const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000)

  const body = {
    id: show.id,
    name: show.title,
    playlistPath: buildAudioPath(show.audioUrl),
    // Postgres already materializes recurring shows into individual one-off
    // rows (src/lib/server/series.ts) — kacl only ever sees one-offs, never
    // a cron expression.
    cronExpression: null,
    oneOffStartUtc: startsAt.toISOString(),
    oneOffEndUtc: endsAt.toISOString(),
    durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
    timeZoneId: 'UTC',
    enabled: true,
    priority: 0,
  }

  try {
    const res = await fetch(`${kaclUrl()}/shows`, {
      method: 'POST',
      headers: controlHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[kacl-shows-client] Failed to sync show ${show.id} to kacl: HTTP ${res.status}`)
    }
  } catch (err) {
    console.error(`[kacl-shows-client] Could not reach kacl to sync show ${show.id}:`, err)
  }
}

/** Removes a show from kacl's scheduler. kacl stops it first if it's the
 *  currently active session, then re-syncs its own trigger set — the app
 *  doesn't need to separately check/stop playout on delete anymore. */
export const deleteKaclShow = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${kaclUrl()}/shows/${id}`, {
      method: 'DELETE',
      headers: controlHeaders(),
    })
    if (!res.ok && res.status !== 404) {
      console.error(`[kacl-shows-client] Failed to delete show ${id} from kacl: HTTP ${res.status}`)
    }
  } catch (err) {
    console.error(`[kacl-shows-client] Could not reach kacl to delete show ${id}:`, err)
  }
}
