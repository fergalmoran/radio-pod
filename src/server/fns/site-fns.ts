import { createServerFn } from '@tanstack/react-start'
import { getSiteSettings } from '@/lib/server/site-settings'

export const getPublicSiteSettings = createServerFn({ method: 'GET' }).handler(getSiteSettings)
