import { queryOptions } from '@tanstack/react-query'
import { getAdminUsers, getMailSettings, getSiteSettings } from '@/server/fns/admin-fns'

export const adminUsersQueryOptions = queryOptions({
  queryKey: ['admin', 'users'],
  queryFn: () => getAdminUsers(),
})

export const mailSettingsQueryOptions = queryOptions({
  queryKey: ['admin', 'mail-settings'],
  queryFn: () => getMailSettings(),
})

export const siteSettingsQueryOptions = queryOptions({
  queryKey: ['admin', 'site-settings'],
  queryFn: () => getSiteSettings(),
})
