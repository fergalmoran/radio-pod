import '@tanstack/react-start/server-only'
import * as signalR from '@microsoft/signalr'
import { kaclUrl } from './kacl-client'
import { pollKaclNowPlaying } from './now-playing'
import { handlePlayoutEvent } from './playout-events'

const INITIAL_CONNECT_RETRY_MS = 5000

/** Persistent connection to kacl's PlayoutHub — replaces the old inbound
 *  webhook. The app's server connects *out* to kacl instead of kacl needing
 *  a route back into the app, so no APP_PUBLIC_URL/signing secret needed
 *  anymore. Call once per process from scheduler.ts's ensureRunning(). */
export const startPlayoutHubConnection = (): void => {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${kaclUrl()}/hubs/playout`, {
      accessTokenFactory: () => process.env.KACL_CONTROL_API_KEY ?? '',
    })
    // withAutomaticReconnect()'s default retry policy gives up permanently
    // after 4 attempts (~44s) — fine for a transient blip, not for kacl
    // being down for a while (a redeploy, a crash-loop). This app is a
    // long-lived process with nothing else to fall back on, so it should
    // just keep trying at a steady interval forever.
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: () => INITIAL_CONNECT_RETRY_MS,
    })
    .build()

  connection.on('playoutEvent', (event: unknown) => {
    void handlePlayoutEvent(event as Parameters<typeof handlePlayoutEvent>[0])
  })

  // Once connected (initially or after a reconnect), resync via the
  // existing reconciliation poll in case any events were missed while
  // disconnected.
  connection.onreconnected(() => void pollKaclNowPlaying())

  const connectWithRetry = async (): Promise<void> => {
    while (true) {
      try {
        await connection.start()
        console.log('[playout-hub-client] Connected to kacl PlayoutHub.')
        void pollKaclNowPlaying()
        return
      } catch (err) {
        console.error(
          `[playout-hub-client] Could not connect to kacl PlayoutHub, retrying in ${INITIAL_CONNECT_RETRY_MS}ms:`,
          err,
        )
        await new Promise((resolve) => setTimeout(resolve, INITIAL_CONNECT_RETRY_MS))
      }
    }
  }

  // withAutomaticReconnect() only covers drops after a first successful
  // connection — it won't retry a connection that never came up in the
  // first place (e.g. kacl not started yet when the app boots), and
  // onclose() fires once the connection is fully given up on (never, given
  // the infinite retry policy above, but kept as a safety net). Both route
  // through the same retry loop as the initial connect.
  connection.onclose(() => void connectWithRetry())

  void connectWithRetry()
}
