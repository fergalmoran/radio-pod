import '@tanstack/react-start/server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

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
}

/** Public, unauthenticated snapshot of what kacl is currently playing — used
 *  to seed now-playing state on server startup, before the first webhook. */
export const getPlayoutSnapshot = async (): Promise<KaclPlayoutSnapshot | null> => {
  try {
    const res = await fetch(`${kaclUrl()}/playout/status`)
    if (!res.ok) return null
    return (await res.json()) as KaclPlayoutSnapshot
  } catch {
    return null
  }
}

type WebhookSubscription = { id: string; targetUrl: string }

/** Idempotently registers this app's webhook endpoint with kacl so it
 *  starts receiving playout.* events. Safe to call on every server start. */
export const ensureWebhookSubscription = async (): Promise<void> => {
  const targetUrl = `${process.env.APP_PUBLIC_URL ?? 'http://localhost:3000'}/api/kacl/webhook`
  const secret = process.env.KACL_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[kacl-client] KACL_WEBHOOK_SECRET not set — skipping webhook registration.')
    return
  }

  try {
    const listRes = await fetch(`${kaclUrl()}/webhooks`, { headers: controlHeaders() })
    if (!listRes.ok) {
      console.error(`[kacl-client] Failed to list kacl webhook subscriptions: HTTP ${listRes.status}`)
      return
    }
    const subscriptions = (await listRes.json()) as WebhookSubscription[]
    if (subscriptions.some((s) => s.targetUrl === targetUrl)) return

    const createRes = await fetch(`${kaclUrl()}/webhooks`, {
      method: 'POST',
      headers: controlHeaders(),
      body: JSON.stringify({
        targetUrl,
        eventTypes: ['*'],
        signingSecret: secret,
        enabled: true,
      }),
    })
    if (!createRes.ok) {
      console.error(`[kacl-client] Failed to register kacl webhook subscription: HTTP ${createRes.status}`)
      return
    }
    console.log(`[kacl-client] Registered webhook subscription with kacl -> ${targetUrl}`)
  } catch (err) {
    console.error('[kacl-client] Could not reach kacl to register webhook subscription:', err)
  }
}

/** Verifies kacl's `X-KACL-Signature: sha256=<hex>` header (HMAC-SHA256 over
 *  the raw request body, same scheme WebhookDeliveryWorker.cs signs with). */
export const verifyKaclSignature = (rawBody: string, signatureHeader: string | null): boolean => {
  const secret = process.env.KACL_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const expectedBytes = Buffer.from(expected)
  const providedBytes = Buffer.from(signatureHeader)
  if (expectedBytes.length !== providedBytes.length) return false

  return timingSafeEqual(expectedBytes, providedBytes)
}
