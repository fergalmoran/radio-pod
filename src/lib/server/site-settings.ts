import '@tanstack/react-start/server-only'
import { siteSettings as defaults } from '@/lib/site-settings'

type SiteSettings = {
  name: string
  tagline: string
  description: string
  logoUrl: string
  faviconUrl: string
  social: { twitter: string; facebook: string; instagram: string }
}

let cached: SiteSettings | undefined
let expiry = 0

export const invalidateSiteSettingsCache = (): void => {
  expiry = 0
}

export const getSiteSettings = async (): Promise<SiteSettings> => {
  if (Date.now() < expiry && cached !== undefined) return cached
  try {
    const { db } = await import('@/db')
    const { siteSettings } = await import('@/db/schema')
    const rows = await db.select().from(siteSettings)
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
    cached = {
      name: map['site.name'] || process.env.SETTINGS_SITE_NAME || defaults.name,
      tagline: map['site.tagline'] || process.env.SETTINGS_SITE_TAGLINE || defaults.tagline,
      description: map['site.description'] || process.env.SETTINGS_SITE_DESCRIPTION || defaults.description || '',
      logoUrl: map['site.logoUrl'] || process.env.SETTINGS_SITE_LOGO_URL || defaults.logoUrl || '',
      faviconUrl: map['site.faviconUrl'] || process.env.SETTINGS_SITE_FAVICON_URL || defaults.faviconUrl || '',
      social: {
        twitter: map['site.social.twitter'] || process.env.SETTINGS_SITE_SOCIAL_TWITTER || defaults.social.twitter || '',
        facebook: map['site.social.facebook'] || process.env.SETTINGS_SITE_SOCIAL_FACEBOOK || defaults.social.facebook || '',
        instagram: map['site.social.instagram'] || process.env.SETTINGS_SITE_SOCIAL_INSTAGRAM || defaults.social.instagram || '',
      },
    }
  } catch {
    cached = {
      name: process.env.SETTINGS_SITE_NAME || defaults.name,
      tagline: process.env.SETTINGS_SITE_TAGLINE || defaults.tagline,
      description: process.env.SETTINGS_SITE_DESCRIPTION || defaults.description || '',
      logoUrl: process.env.SETTINGS_SITE_LOGO_URL || defaults.logoUrl || '',
      faviconUrl: process.env.SETTINGS_SITE_FAVICON_URL || defaults.faviconUrl || '',
      social: {
        twitter: process.env.SETTINGS_SITE_SOCIAL_TWITTER || defaults.social.twitter || '',
        facebook: process.env.SETTINGS_SITE_SOCIAL_FACEBOOK || defaults.social.facebook || '',
        instagram: process.env.SETTINGS_SITE_SOCIAL_INSTAGRAM || defaults.social.instagram || '',
      },
    }
  }
  expiry = Date.now() + 5 * 60 * 1000
  return cached
}
