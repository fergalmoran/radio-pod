import { queryOptions } from '@tanstack/react-query'
import { getShows, getShowsForUser, getFinishedShows } from '@/server/fns/shows-fns'

export const showsQueryOptions = queryOptions({
  queryKey: ['shows'],
  queryFn: () => getShows(),
})

export const showsForUserQueryOptions = queryOptions({
  queryKey: ['shows', 'for-user'],
  queryFn: () => getShowsForUser(),
})

export const finishedShowsQueryOptions = queryOptions({
  queryKey: ['shows', 'finished'],
  queryFn: () => getFinishedShows(),
})
