import { useQuery } from '@tanstack/react-query'
import { publicSiteSettingsQueryOptions } from '@/lib/queries/site-settings'
import { siteSettings as defaults } from '@/lib/site-settings'

const defaultData = {
  name: defaults.name,
  tagline: defaults.tagline,
  description: defaults.description,
  logoUrl: defaults.logoUrl ?? '',
  faviconUrl: defaults.faviconUrl ?? '',
  social: {
    twitter: defaults.social.twitter ?? '',
    facebook: defaults.social.facebook ?? '',
    instagram: defaults.social.instagram ?? '',
  },
}

export const useSiteSettings = () => {
  const { data } = useQuery({
    ...publicSiteSettingsQueryOptions,
    placeholderData: defaultData,
  })
  return data ?? defaultData
}
