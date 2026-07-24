import '@tanstack/react-start/server-only'
import { join } from 'node:path'
import { gt, and, lte, eq } from 'drizzle-orm'
import { db } from '@/db'
import { shows, users } from '@/db/schema'
import { setNowPlaying, markEpisodeStart, markLiveStart, clearEpisodeGuard, pollKaclNowPlaying, isEpisodeAudioConfirmed } from './now-playing'
import { getSiteSettings } from './site-settings'
import { startExternalSession, stopActiveSession, ensureWebhookSubscription } from './kacl-client'

type ShowJob = {
  id: number
  broadcastAt: Date
  audioUrl: string | null
  durationSeconds: number | null
  title: string
  imageUrl: string | null
  hostName: string | null
}

type SchedulerState = {
  jobs: Map<number, ReturnType<typeof setTimeout>>
  // Mirrors `jobs` but keeps the show details around for the /debug page —
  // timers alone can't say what's queued or when it's due.
  jobMeta: Map<number, { title: string; broadcastAt: Date }>
  initialized: boolean
}

// Vite's dev-mode SSR re-evaluates this whole module on every hot reload,
// which would otherwise reset `jobs`/`initialized` to empty/false while any
// setTimeout callbacks already scheduled by the *previous* module instance
// are still pending in the process (plain setTimeout calls aren't tied to a
// module instance and don't get cancelled by a reload) — silently stacking
// a duplicate timer for every still-upcoming show on top of the orphaned
// one, every single reload. Persisting on globalThis survives reloads so
// scheduleShow's own dedup (via cancelShow) can find and clear a show's
// previous timer instead of piling new ones on top of it.
const globalForScheduler = globalThis as unknown as { __radioSchedulerState?: SchedulerState }
const schedulerState: SchedulerState = (globalForScheduler.__radioSchedulerState ??= {
  jobs: new Map(),
  jobMeta: new Map(),
  initialized: false,
})
const jobs = schedulerState.jobs
const jobMeta = schedulerState.jobMeta

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
  if (schedulerState.initialized) return
  schedulerState.initialized = true
  void ensureWebhookSubscription()
  void refreshSchedule()
  setInterval(() => void refreshSchedule(), 24 * 60 * 60 * 1000)
  // Restore in-progress show state before the first kacl poll so the
  // guard window is armed and the dead-air poll doesn't overwrite it.
  void resumeCurrentShow().then(() => {
    void pollKaclNowPlaying()
    setInterval(() => void pollKaclNowPlaying(), 15_000)
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
      streamKey: users.streamKey,
      liveStartedAt: shows.liveStartedAt,
    })
    .from(shows)
    .leftJoin(users, eq(users.id, shows.hostUserId))
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

  // audioUrl in DB is /api/media/audio/filename.mp3 — map to the real host
  // path kacl reads from directly (kacl isn't containerized here, so this is
  // the same AUDIO_DIR the app itself serves episode audio from).
  const filename = show.audioUrl.replace(/^\/api\/media\/audio\//, '')
  const audioDir = process.env.AUDIO_DIR ?? '/mnt/audio/shows'
  const filePath = join(audioDir, filename)

  void pushEpisodeUntilConfirmed(show, filePath, endsAt)
}

// kacl's control API can accept a session start request without the playout
// loop actually switching to it (transient errors are swallowed internally,
// same class of race the old Liquidsoap request.queue push had). kacl's own
// `playout.track.started` webhook (source "external") is the only proof a
// push really took effect, so verify against that and retry if it didn't.
const PUSH_MAX_ATTEMPTS = 3
const PUSH_VERIFY_DELAY_MS = 4000

const pushEpisodeUntilConfirmed = async (show: ShowJob, filePath: string, endsAt: number): Promise<void> => {
  const siteName = (await getSiteSettings()).name

  for (let attempt = 1; attempt <= PUSH_MAX_ATTEMPTS; attempt++) {
    const pushedAt = Date.now()
    try {
      const result = await startExternalSession({
        externalSessionId: `episode:${show.id}`,
        title: show.title,
        artist: show.hostName ?? siteName,
        sourcePath: filePath,
        expectedEndsAtUtc: new Date(endsAt).toISOString(),
        imageUrl: show.imageUrl ?? undefined,
      })
      if (!result.success) {
        console.error(`[scheduler] kacl rejected episode start (attempt ${attempt}/${PUSH_MAX_ATTEMPTS}): ${result.message}`)
      }
    } catch (err) {
      console.error(`[scheduler] Failed to push show to kacl (attempt ${attempt}/${PUSH_MAX_ATTEMPTS}):`, err)
    }

    await new Promise((resolve) => setTimeout(resolve, PUSH_VERIFY_DELAY_MS))

    if (isEpisodeAudioConfirmed(filePath, pushedAt)) return

    const willRetry = attempt < PUSH_MAX_ATTEMPTS
    console.error(
      `[scheduler] kacl never confirmed switching to ${filePath} (attempt ${attempt}/${PUSH_MAX_ATTEMPTS})` +
        (willRetry ? ' — retrying.' : ' — giving up.'),
    )
  }
}

/** Skips the currently playing show, falling back to dead air. */
export const stopCurrentShow = async (): Promise<void> => {
  clearEpisodeGuard()
  await stopActiveSession()
  await pollKaclNowPlaying()
}
