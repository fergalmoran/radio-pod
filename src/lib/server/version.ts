import '@tanstack/react-start/server-only'

const GITHUB_REPO = 'fergalmoran/radio-pod'
const CACHE_TTL_MS = 30 * 60_000 // 30 minutes — avoid hammering GitHub's unauthenticated rate limit

let cachedLatest: string | null = null
let cachedAt = 0

const fetchLatestRelease = async (): Promise<string | null> => {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { tag_name?: string }
    return data.tag_name ?? null
  } catch {
    return null
  }
}

export type VersionInfo = {
  current: string
  latest: string | null
  updateAvailable: boolean
  releaseUrl: string
}

export const getVersionInfo = async (): Promise<VersionInfo> => {
  const current = process.env.RELEASE_VERSION ?? 'dev'

  if (Date.now() - cachedAt > CACHE_TTL_MS) {
    cachedLatest = await fetchLatestRelease()
    cachedAt = Date.now()
  }

  return {
    current,
    latest: cachedLatest,
    // "dev" means this is a local/unreleased build — nothing meaningful to compare.
    updateAvailable: current !== 'dev' && cachedLatest !== null && cachedLatest !== current,
    releaseUrl: `https://github.com/${GITHUB_REPO}/releases/latest`,
  }
}
