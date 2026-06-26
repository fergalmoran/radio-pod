import { queryOptions } from '@tanstack/react-query'
import { getEpisodesForMonth } from '@/server/fns/schedule-fns'

export const episodesForMonthQueryOptions = (month: string) =>
  queryOptions({
    queryKey: ['episodes', 'month', month],
    queryFn: () => getEpisodesForMonth({ data: { month } }),
  })
