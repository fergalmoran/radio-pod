import { queryOptions } from '@tanstack/react-query'
import { getEpisodesForMonth, getUpNext } from '@/server/fns/schedule-fns'

export const episodesForMonthQueryOptions = (month: string) =>
  queryOptions({
    queryKey: ['episodes', 'month', month],
    queryFn: () => getEpisodesForMonth({ data: { month } }),
  })

export const upNextQueryOptions = queryOptions({
  queryKey: ['episodes', 'up-next'],
  queryFn: () => getUpNext(),
  refetchInterval: 60_000,
})
