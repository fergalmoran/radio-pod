import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  serial,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['user', 'editor', 'dj', 'admin'])
export const showLiveStatusEnum = pgEnum('show_live_status', ['offline', 'live'])

// ─── better-auth tables ───────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── radio app tables ─────────────────────────────────────────────────────────

export const shows = pgTable('shows', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  hostName: text('host_name'),
  hostUserId: text('host_user_id').references(() => users.id, { onDelete: 'set null' }),
  imageUrl: text('image_url'),
  schedule: jsonb('schedule'),
  streamKey: text('stream_key').unique(),
  liveStatus: showLiveStatusEnum('live_status').notNull().default('offline'),
  liveStartedAt: timestamp('live_started_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const episodes = pgTable('episodes', {
  id: serial('id').primaryKey(),
  showId: integer('show_id')
    .references(() => shows.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  audioUrl: text('audio_url'),
  imageUrl: text('image_url'),
  durationSeconds: integer('duration_seconds'),
  broadcastAt: timestamp('broadcast_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const savedEpisodes = pgTable(
  'saved_episodes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    episodeId: integer('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.episodeId] })],
)

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  replyToId: integer('reply_to_id'),
  content: text('content'),
  gifUrl: text('gif_url'),
  gifTitle: text('gif_title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type Show = typeof shows.$inferSelect
export type Episode = typeof episodes.$inferSelect
export type SavedEpisode = typeof savedEpisodes.$inferSelect
export type ChatMessage = typeof chatMessages.$inferSelect
export type UserRole = typeof userRoleEnum.enumValues[number]
export type SiteSetting = typeof siteSettings.$inferSelect
