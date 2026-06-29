import { createServerFn } from '@tanstack/react-start'
import { inArray } from 'drizzle-orm'
import { siteSettings as defaults } from '@/lib/site-settings'

const SITE_KEYS = [
  'site.name',
  'site.tagline',
  'site.description',
  'site.logoUrl',
  'site.faviconUrl',
  'site.social.twitter',
  'site.social.facebook',
  'site.social.instagram',
] as const

export const getPublicSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { siteSettings: settingsTable } = await import('@/db/schema')
  const rows = await db.select().from(settingsTable).where(inArray(settingsTable.key, [...SITE_KEYS]))
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
  return {
    name: map['site.name'] || defaults.name,
    tagline: map['site.tagline'] || defaults.tagline,
    description: map['site.description'] || defaults.description,
    logoUrl: map['site.logoUrl'] || defaults.logoUrl || '',
    faviconUrl: map['site.faviconUrl'] || defaults.faviconUrl || '',
    social: {
      twitter: map['site.social.twitter'] || defaults.social.twitter || '',
      facebook: map['site.social.facebook'] || defaults.social.facebook || '',
      instagram: map['site.social.instagram'] || defaults.social.instagram || '',
    },
  }
})
