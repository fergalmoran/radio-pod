import { queryOptions } from '@tanstack/react-query'
import { getShows, getShowsForUser } from '@/server/fns/shows-fns'
import { getEpisodesForMonth } from '@/server/fns/schedule-fns'

export const showsQueryOptions = queryOptions({
  queryKey: ['shows'],
  queryFn: () => getShows(),
})

export const showsForUserQueryOptions = queryOptions({
  queryKey: ['shows', 'for-user'],
  queryFn: () => getShowsForUser(),
})

export const episodesForMonthQueryOptions = (month: string) =>
  queryOptions({
    queryKey: ['episodes', 'month', month],
    queryFn: () => getEpisodesForMonth({ data: { month } }),
  })
