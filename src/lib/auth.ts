import '@tanstack/react-start/server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import * as schema from '@/db/schema'

function createAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'user',
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      ...(process.env.GOOGLE_OAUTH_CLIENT_ID && {
        google: {
          clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
          clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        },
      }),
      ...(process.env.GITHUB_OAUTH_CLIENT_ID && {
        github: {
          clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
          clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
        },
      }),
      ...(process.env.DISCORD_OAUTH_CLIENT_ID && {
        discord: {
          clientId: process.env.DISCORD_OAUTH_CLIENT_ID,
          clientSecret: process.env.DISCORD_OAUTH_CLIENT_SECRET!,
        },
      }),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const [{ value }] = await db.select({ value: count() }).from(schema.users)
            if (value === 1) {
              await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, user.id))
            }
          },
        },
      },
    },
    plugins: [tanstackStartCookies()],
  })
}

let _auth: ReturnType<typeof createAuth> | undefined

export function getAuth() {
  if (!_auth) _auth = createAuth()
  return _auth
}

export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
  get(_, prop) {
    return getAuth()[prop as keyof ReturnType<typeof createAuth>]
  },
})

export type Session = typeof auth.$Infer.Session
