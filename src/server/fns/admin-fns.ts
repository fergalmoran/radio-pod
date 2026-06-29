import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import type { UserRole } from '@/db/schema'

type MailSettingsInput = {
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  fromName: string
  secure: boolean
}

type UpdateRoleInput = {
  userId: string
  role: UserRole
}

const requireAdmin = async () => {
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({ headers: await getRequestHeaders() })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || role !== 'admin') throw new Error('Unauthorized')
}

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

const MAIL_KEYS = [
  'mail.host',
  'mail.port',
  'mail.username',
  'mail.password',
  'mail.fromAddress',
  'mail.fromName',
  'mail.secure',
] as const

const fetchMailSettings = async () => {
  const { db } = await import('@/db')
  const { siteSettings } = await import('@/db/schema')
  const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, [...MAIL_KEYS]))
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
  if (!map['mail.host']) return null
  return {
    host: map['mail.host'],
    port: parseInt(map['mail.port'] ?? '587', 10),
    username: map['mail.username'] ?? '',
    password: map['mail.password'] ?? '',
    fromAddress: map['mail.fromAddress'] ?? '',
    fromName: map['mail.fromName'] ?? '',
    secure: map['mail.secure'] === 'true',
  }
}

const fetchSiteSettings = async () => {
  const { db } = await import('@/db')
  const { siteSettings: settingsTable } = await import('@/db/schema')
  const rows = await db.select().from(settingsTable).where(inArray(settingsTable.key, [...SITE_KEYS]))
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
  return {
    name: map['site.name'] ?? 'Surge FM',
    tagline: map['site.tagline'] ?? 'Robot Powered Radio',
    description: map['site.description'] ?? '',
    logoUrl: map['site.logoUrl'] ?? '',
    faviconUrl: map['site.faviconUrl'] ?? '',
    social: {
      twitter: map['site.social.twitter'] ?? '',
      facebook: map['site.social.facebook'] ?? '',
      instagram: map['site.social.instagram'] ?? '',
    },
  }
}

export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return fetchSiteSettings()
})

export const saveSiteSettings = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as {
    name: string
    tagline: string
    description: string
    logoUrl: string
    faviconUrl: string
    social: { twitter: string; facebook: string; instagram: string }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    const { db } = await import('@/db')
    const { siteSettings: settingsTable } = await import('@/db/schema')
    const now = new Date()
    const entries = [
      { key: 'site.name', value: data.name, updatedAt: now },
      { key: 'site.tagline', value: data.tagline, updatedAt: now },
      { key: 'site.description', value: data.description, updatedAt: now },
      { key: 'site.logoUrl', value: data.logoUrl, updatedAt: now },
      { key: 'site.faviconUrl', value: data.faviconUrl, updatedAt: now },
      { key: 'site.social.twitter', value: data.social.twitter, updatedAt: now },
      { key: 'site.social.facebook', value: data.social.facebook, updatedAt: now },
      { key: 'site.social.instagram', value: data.social.instagram, updatedAt: now },
    ]
    await db
      .insert(settingsTable)
      .values(entries)
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
      })
  })

export const getAdminUsers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { db } = await import('@/db')
  const { users } = await import('@/db/schema')
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.name))
})

export const getMailSettings = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return fetchMailSettings()
})

export const saveMailSettings = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as MailSettingsInput)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { db } = await import('@/db')
    const { siteSettings } = await import('@/db/schema')
    const now = new Date()
    const entries = [
      { key: 'mail.host', value: data.host, updatedAt: now },
      { key: 'mail.port', value: String(data.port), updatedAt: now },
      { key: 'mail.username', value: data.username, updatedAt: now },
      { key: 'mail.password', value: data.password, updatedAt: now },
      { key: 'mail.fromAddress', value: data.fromAddress, updatedAt: now },
      { key: 'mail.fromName', value: data.fromName, updatedAt: now },
      { key: 'mail.secure', value: String(data.secure), updatedAt: now },
    ]
    await db
      .insert(siteSettings)
      .values(entries)
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
      })
  })

const buildTransport = (settings: { host: string; port: number; secure: boolean; username: string; password: string }) => {
  return import('nodemailer').then(({ default: nodemailer }) =>
    nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
    })
  )
}

export const verifyMailSettings = createServerFn({ method: 'POST' }).handler(async () => {
  await requireAdmin()
  const settings = await fetchMailSettings()
  if (!settings?.host) throw new Error('Mail settings not configured')
  const transporter = await buildTransport(settings)
  await transporter.verify()
})

export const testMailSettings = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as { to: string })
  .handler(async ({ data }) => {
    await requireAdmin()
    const settings = await fetchMailSettings()
    if (!settings?.host) throw new Error('Mail settings not configured')
    const transporter = await buildTransport(settings)
    await transporter.sendMail({
      from: settings.fromName ? `"${settings.fromName}" <${settings.fromAddress}>` : settings.fromAddress,
      to: data.to,
      subject: 'Radio Pod — mail settings test',
      text: 'If you received this, your mail settings are working correctly.',
    })
  })

export const updateUserRole = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as UpdateRoleInput)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { db } = await import('@/db')
    const { users } = await import('@/db/schema')
    await db.update(users).set({ role: data.role }).where(eq(users.id, data.userId))
  })
