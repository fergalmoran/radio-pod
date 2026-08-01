import '@tanstack/react-start/server-only'

export const kaclUrl = (): string => process.env.KACL_URL ?? 'http://localhost:8080'

export const controlHeaders = (): HeadersInit => {
  const apiKey = process.env.KACL_CONTROL_API_KEY
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  }
}

/** Stops kacl's active session (whatever it is — scheduled or otherwise),
 *  falling back to dead air. Used by the "Stop Show" admin action. */
export const stopActiveSession = async (): Promise<void> => {
  await fetch(`${kaclUrl()}/control/playout/stop`, {
    method: 'POST',
    headers: controlHeaders(),
  })
}

type KaclPlayoutSnapshot = {
  activeSessionId: string | null
  activeShowId: string | null
  activeShowName: string | null
  activeArtist: string | null
  activeImageUrl: string | null
  currentSource: string | null
  currentTrackPath: string | null
  currentShowName: string | null
  currentTrackTitle: string | null
  currentTrackArtist: string | null
  // "reported*" lags "current*" by kacl's crossfade duration — kacl only
  // fills these in once a track is actually the sole thing on air, not the
  // moment it starts crossfading in. Display/reconciliation should read
  // these, not current* (see kacl PlayoutCoordinator.ReportTrackStartedAsync).
  reportedSource: string | null
  reportedTrackPath: string | null
  reportedShowName: string | null
  reportedTrackTitle: string | null
  reportedTrackArtist: string | null
  reportedTrackImageUrl: string | null
}

/** Public, unauthenticated snapshot of what kacl is currently playing — used
 *  to seed now-playing state on server startup and as a reconciliation
 *  fallback for the PlayoutHub push connection (see playout-hub-client.ts). */
export const getPlayoutSnapshot = async (): Promise<KaclPlayoutSnapshot | null> => {
  try {
    const res = await fetch(`${kaclUrl()}/playout/status`)
    if (!res.ok) return null
    return (await res.json()) as KaclPlayoutSnapshot
  } catch {
    return null
  }
}
