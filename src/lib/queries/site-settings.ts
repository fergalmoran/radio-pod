import { queryOptions } from '@tanstack/react-query'
import { getPublicSiteSettings } from '@/server/fns/site-fns'

export const publicSiteSettingsQueryOptions = queryOptions({
  queryKey: ['site-settings'],
  queryFn: () => getPublicSiteSettings(),
  staleTime: 1000 * 60 * 5,
})
