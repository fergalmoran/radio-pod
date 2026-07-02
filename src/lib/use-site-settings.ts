import { useSuspenseQuery } from '@tanstack/react-query'
import { publicSiteSettingsQueryOptions } from '@/lib/queries/site-settings'

export const useSiteSettings = () => {
  const { data } = useSuspenseQuery(publicSiteSettingsQueryOptions)
  return data
}
