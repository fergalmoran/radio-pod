import { queryOptions } from '@tanstack/react-query'
import { getNowPlayingDebugInfo } from '@/server/fns/debug-fns'

export const nowPlayingDebugQueryOptions = queryOptions({
  queryKey: ['debug', 'now-playing'],
  queryFn: () => getNowPlayingDebugInfo(),
  refetchInterval: 3_000,
})
