import { queryOptions } from '@tanstack/react-query'
import { getShowsForMonth, getUpNext } from '@/server/fns/schedule-fns'

export const showsForMonthQueryOptions = (month: string) =>
  queryOptions({
    queryKey: ['shows', 'month', month],
    queryFn: () => getShowsForMonth({ data: { month } }),
  })

export const upNextQueryOptions = queryOptions({
  queryKey: ['shows', 'up-next'],
  queryFn: () => getUpNext(),
  refetchInterval: 60_000,
})
