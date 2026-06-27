import '@tanstack/react-start/server-only'
import { join } from 'node:path'
import net from 'node:net'
import { gt, eq } from 'drizzle-orm'
import { db } from '@/db'
import { episodes, shows } from '@/db/schema'
import { setNowPlaying, pollIcecastNowPlaying } from './now-playing'

type EpisodeJob = {
  id: number
  broadcastAt: Date
  audioUrl: string | null
  title: string
  imageUrl: string | null
  showTitle: string | null
}

const jobs = new Map<number, ReturnType<typeof setTimeout>>()
let initialized = false

export function ensureRunning(): void {
  if (initialized) return
  initialized = true
  void loadAndScheduleEpisodes()
  setInterval(() => void loadAndScheduleEpisodes(), 24 * 60 * 60 * 1000)
  // Seed now-playing from Icecast and keep dead air metadata fresh
  void pollIcecastNowPlaying()
  setInterval(() => void pollIcecastNowPlaying(), 15_000)
}

async function loadAndScheduleEpisodes(): Promise<void> {
  try {
    const now = new Date()
    const rows = await db
      .select({
        id: episodes.id,
        broadcastAt: episodes.broadcastAt,
        audioUrl: episodes.audioUrl,
        title: episodes.title,
        imageUrl: episodes.imageUrl,
        showTitle: shows.title,
      })
      .from(episodes)
      .leftJoin(shows, eq(shows.id, episodes.showId))
      .where(gt(episodes.broadcastAt, now))

    for (const row of rows) {
      scheduleEpisode(row)
    }
  } catch (err) {
    console.error('[scheduler] Failed to load episodes:', err)
  }
}

export function scheduleEpisode(episode: EpisodeJob): void {
  const existing = jobs.get(episode.id)
  if (existing !== undefined) clearTimeout(existing)

  const delay = episode.broadcastAt.getTime() - Date.now()
  if (delay < 0) return

  // setTimeout max is ~24.8 days; daily refresh reschedules anything beyond that
  const MAX_DELAY = 2_147_483_647
  if (delay > MAX_DELAY) return

  const timer = setTimeout(() => void onEpisodeStart(episode), delay)
  jobs.set(episode.id, timer)
}

export function cancelEpisode(id: number): void {
  const timer = jobs.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    jobs.delete(id)
  }
}

async function onEpisodeStart(episode: EpisodeJob): Promise<void> {
  jobs.delete(episode.id)

  if (!episode.audioUrl) return

  // audioUrl in DB is /api/media/audio/filename.mp3 — map to the path Liquidsoap sees
  const filename = episode.audioUrl.replace(/^\/api\/media\/audio\//, '')
  const liquidsoap_dir = process.env.LIQUIDSOAP_AUDIO_DIR ?? '/mnt/audio/shows'
  const filePath = join(liquidsoap_dir, filename)

  try {
    await pushToLiquidsoap(filePath)
    setNowPlaying({
      type: 'episode',
      title: episode.title,
      artist: episode.showTitle ?? 'Surge FM',
      imageUrl: episode.imageUrl ?? undefined,
    })
  } catch (err) {
    console.error('[scheduler] Failed to push episode to Liquidsoap:', err)
  }
}

async function pushToLiquidsoap(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const host = process.env.LIQUIDSOAP_HOST ?? 'localhost'
    const port = parseInt(process.env.LIQUIDSOAP_PORT ?? '1234', 10)
    const client = net.createConnection({ host, port })
    client.once('connect', () => {
      client.write(`episodes.push ${filePath}\n`)
      client.end()
      resolve()
    })
    client.once('error', reject)
  })
}
