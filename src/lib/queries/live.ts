import { queryOptions } from '@tanstack/react-query'
import { getShowLiveInfo } from '@/server/fns/live-fns'

export const showLiveInfoQueryOptions = (showId: number) =>
  queryOptions({
    queryKey: ['live', showId],
    queryFn: () => getShowLiveInfo({ data: { showId } }),
    refetchInterval: 10_000,
  })
