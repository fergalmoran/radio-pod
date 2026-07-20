import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

let browserContext:
  | {
      queryClient: QueryClient
    }
  | undefined

export const getContext = () => {
  // The server is a long-lived process, not a fresh isolate per request —
  // a shared QueryClient here would keep serving whatever it first cached
  // for a given query key to every subsequent request, forever, since
  // `ensureQueryData` only fetches when an entry is missing. Mutations
  // invalidate the browser's queryClient, not this one, so the server's
  // snapshot would silently drift from the real data. Always hand the
  // server a fresh client; only the browser gets a persistent singleton.
  if (typeof window === 'undefined') {
    return { queryClient: new QueryClient() }
  }

  if (browserContext) {
    return browserContext
  }

  browserContext = { queryClient: new QueryClient() }

  return browserContext
}

const TanStackQueryProvider = ({ children }: { children: ReactNode }) => {
  const { queryClient } = getContext()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default TanStackQueryProvider
