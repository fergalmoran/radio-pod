import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { shows, users } from '@/db/schema'
import { setNowPlaying, markLiveStart, clearEpisodeGuard, pollKaclNowPlaying } from './now-playing'
import { getSiteSettings } from './site-settings'
import { stopActiveSession, ensureWebhookSubscription } from './kacl-client'

let initialized = false

const refreshSchedule = async (): Promise<void> => {
  const { materializeAllSeries } = await import('./series')
  await materializeAllSeries()
}

export const ensureRunning = (): void => {
  if (initialized) return
  initialized = true
  void ensureWebhookSubscription()
  void refreshSchedule()
  setInterval(() => void refreshSchedule(), 24 * 60 * 60 * 1000)
  // kacl owns playout timing entirely (its own Quartz scheduler, synced from
  // Postgres via kacl-shows-client.ts, with its own restart recovery) — the
  // only thing left for the app to resume after its own restart is the live
  // OBS/MediaMTX badge, since that state is app-side in-memory only.
  void resumeLiveShow().then(() => {
    void pollKaclNowPlaying()
    setInterval(() => void pollKaclNowPlaying(), 15_000)
  })
}

// A show can still be live in the DB (liveStatus = 'live') after a server
// restart, since liveActive/state in now-playing.ts are in-memory only.
// Without this, a restart mid-broadcast drops back to the dead-air poll and
// the client's isLive flag bounces once the real state catches up (via the
// next MediaMTX webhook), tearing down and rebuilding the video/audio
// elements.
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

/** Stops whatever's currently on air via kacl's generic control API — works
 *  regardless of whether it's a kacl-scheduled show or something else, no ID
 *  needed. Falls back to dead air. */
export const stopCurrentShow = async (): Promise<void> => {
  clearEpisodeGuard()
  await stopActiveSession()
  await pollKaclNowPlaying()
}
