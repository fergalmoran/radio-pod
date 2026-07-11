import '@tanstack/react-start/server-only'
import { join } from 'node:path'
import net from 'node:net'
import { gt, and, lte, eq } from 'drizzle-orm'
import { db } from '@/db'
import { shows } from '@/db/schema'
import { setNowPlaying, markEpisodeStart, markLiveStart, clearEpisodeGuard, pollIcecastNowPlaying } from './now-playing'
import { getSiteSettings } from './site-settings'

type ShowJob = {
  id: number
  broadcastAt: Date
  audioUrl: string | null
  durationSeconds: number | null
  title: string
  imageUrl: string | null
  hostName: string | null
}

const jobs = new Map<number, ReturnType<typeof setTimeout>>()
// Mirrors `jobs` but keeps the show details around for the /debug page —
// timers alone can't say what's queued or when it's due.
const jobMeta = new Map<number, { title: string; broadcastAt: Date }>()
let initialized = false

/** What's currently armed to fire — surfaced on /debug so "what's coming up
 *  and when" doesn't require reading server logs. */
export const getScheduledJobs = (): { id: number; title: string; broadcastAt: Date }[] => {
  return [...jobMeta.entries()]
    .map(([id, meta]) => ({ id, ...meta }))
    .sort((a, b) => a.broadcastAt.getTime() - b.broadcastAt.getTime())
}

const refreshSchedule = async (): Promise<void> => {
  const { materializeAllSeries } = await import('./series')
  await materializeAllSeries()
  await loadAndScheduleShows()
}

export const ensureRunning = (): void => {
  if (initialized) return
  initialized = true
  void refreshSchedule()
  setInterval(() => void refreshSchedule(), 24 * 60 * 60 * 1000)
  // Restore in-progress show state before the first Icecast poll so the
  // guard window is armed and the dead-air poll doesn't overwrite it.
  void resumeCurrentShow().then(() => {
    void pollIcecastNowPlaying()
    setInterval(() => void pollIcecastNowPlaying(), 15_000)
  })
}

// Called before resumeCurrentShow: a show can still be live in the DB
// (liveStatus = 'live') after a server restart, since liveActive/state in
// now-playing.ts are in-memory only. Without this, a restart mid-broadcast
// drops back to the Icecast dead-air poll and the client's isLive flag
// bounces once the real state catches up (via the next MediaMTX webhook),
// tearing down and rebuilding the video/audio elements.
const resumeLiveShow = async (): Promise<boolean> => {
  const [show] = await db
    .select({
      id: shows.id,
      title: shows.title,
      hostName: shows.hostName,
      imageUrl: shows.imageUrl,
      hostUserId: shows.hostUserId,
      streamKey: shows.streamKey,
      liveStartedAt: shows.liveStartedAt,
    })
    .from(shows)
    .where(eq(shows.liveStatus, 'live'))
    .limit(1)

  if (!show || !show.streamKey) return false

  markLiveStart()
  setNowPlaying(
    {
      type: 'live',
      title: show.title,
      artist: show.hostName ?? (await getSiteSettings()).name,
      imageUrl: show.imageUrl ?? undefined,
      showId: show.id,
      hostUserId: show.hostUserId ?? undefined,
      hlsUrl: `${process.env.MEDIAMTX_HLS_PUBLIC_URL}/live/${show.streamKey}/index.m3u8`,
      startedAt: show.liveStartedAt?.getTime() ?? Date.now(),
    },
    `Resumed after server restart: show "${show.title}" (id ${show.id}) was already live (streamKey ${show.streamKey})`,
  )
  return true
}

const resumeCurrentShow = async (): Promise<void> => {
  try {
    if (await resumeLiveShow()) return

    const now = new Date()
    const rows = await db
      .select({
        id: shows.id,
        broadcastAt: shows.broadcastAt,
        durationSeconds: shows.durationSeconds,
        title: shows.title,
        imageUrl: shows.imageUrl,
        hostName: shows.hostName,
      })
      .from(shows)
      .where(and(lte(shows.broadcastAt, now), gt(shows.broadcastAt, new Date(now.getTime() - 6 * 60 * 60 * 1000))))
      .limit(10)

    for (const row of rows) {
      const duration = row.durationSeconds ?? 3600
      const endsAt = row.broadcastAt.getTime() + duration * 1000
      if (endsAt > Date.now()) {
        const remainingSeconds = (endsAt - Date.now()) / 1000
        markEpisodeStart(remainingSeconds)
        setNowPlaying(
          {
            type: 'episode',
            title: row.title,
            artist: row.hostName ?? (await getSiteSettings()).name,
            imageUrl: row.imageUrl ?? undefined,
            startsAt: row.broadcastAt.getTime(),
            endsAt,
          },
          `Resumed after server restart: show "${row.title}" (id ${row.id}) was already in progress (broadcastAt ${row.broadcastAt.toISOString()})`,
        )
        break
      }
    }
  } catch (err) {
    console.error('[scheduler] Failed to resume current show:', err)
  }
}

const loadAndScheduleShows = async (): Promise<void> => {
  try {
    const now = new Date()
    const rows = await db
      .select({
        id: shows.id,
        broadcastAt: shows.broadcastAt,
        audioUrl: shows.audioUrl,
        durationSeconds: shows.durationSeconds,
        title: shows.title,
        imageUrl: shows.imageUrl,
        hostName: shows.hostName,
      })
      .from(shows)
      .where(gt(shows.broadcastAt, now))

    for (const row of rows) {
      scheduleShow(row)
    }
  } catch (err) {
    console.error('[scheduler] Failed to load shows:', err)
  }
}

export const scheduleShow = (show: ShowJob): void => {
  const existing = jobs.get(show.id)
  if (existing !== undefined) clearTimeout(existing)

  const delay = show.broadcastAt.getTime() - Date.now()
  if (delay < 0) return

  // setTimeout max is ~24.8 days; daily refresh reschedules anything beyond that
  const MAX_DELAY = 2_147_483_647
  if (delay > MAX_DELAY) return

  const timer = setTimeout(() => void onShowStart(show), delay)
  jobs.set(show.id, timer)
  jobMeta.set(show.id, { title: show.title, broadcastAt: show.broadcastAt })
}

export const cancelShow = (id: number): void => {
  const timer = jobs.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    jobs.delete(id)
  }
  jobMeta.delete(id)
}

const onShowStart = async (show: ShowJob): Promise<void> => {
  jobs.delete(show.id)
  jobMeta.delete(show.id)

  const duration = show.durationSeconds ?? 3600

  // Update the display first, regardless of whether there's audio to push.
  const startsAt = show.broadcastAt.getTime()
  const endsAt = startsAt + duration * 1000
  markEpisodeStart(duration)
  setNowPlaying(
    {
      type: 'episode',
      title: show.title,
      artist: show.hostName ?? (await getSiteSettings()).name,
      imageUrl: show.imageUrl ?? undefined,
      startsAt,
      endsAt,
    },
    `Scheduler: show "${show.title}" (id ${show.id}) reached its broadcastAt (${show.broadcastAt.toISOString()})`,
  )

  if (!show.audioUrl) return

  // audioUrl in DB is /api/media/audio/filename.mp3 — map to the path Liquidsoap sees
  const filename = show.audioUrl.replace(/^\/api\/media\/audio\//, '')
  const liquidsoap_dir = process.env.LIQUIDSOAP_AUDIO_DIR ?? '/mnt/audio/shows'
  const filePath = join(liquidsoap_dir, filename)

  try {
    await sendToLiquidsoap(`episodes.push ${filePath}`)
  } catch (err) {
    console.error('[scheduler] Failed to push show to Liquidsoap:', err)
  }
}

/** Skips the currently playing show, falling back to dead air. */
export const stopCurrentShow = async (): Promise<void> => {
  clearEpisodeGuard()
  await sendToLiquidsoap('episodes.skip')
  await pollIcecastNowPlaying()
}

const sendToLiquidsoap = (command: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const host = process.env.LIQUIDSOAP_HOST ?? 'localhost'
    const port = parseInt(process.env.LIQUIDSOAP_PORT ?? '1234', 10)
    const client = net.createConnection({ host, port })
    client.once('connect', () => {
      client.write(`${command}\n`)
      client.end()
      resolve()
    })
    client.once('error', reject)
  })
}
