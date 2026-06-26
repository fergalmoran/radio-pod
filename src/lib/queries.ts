import { queryOptions } from '@tanstack/react-query'
import { getShows, getShowsForUser } from '#/server/fns/shows-fns'
import { getEpisodesForWeek } from '#/server/fns/schedule-fns'

export const showsQueryOptions = queryOptions({
  queryKey: ['shows'],
  queryFn: () => getShows(),
})

export const showsForUserQueryOptions = queryOptions({
  queryKey: ['shows', 'for-user'],
  queryFn: () => getShowsForUser(),
})

export const episodesForWeekQueryOptions = (weekStart: string) =>
  queryOptions({
    queryKey: ['episodes', 'week', weekStart],
    queryFn: () => getEpisodesForWeek({ data: { weekStart } }),
  })
