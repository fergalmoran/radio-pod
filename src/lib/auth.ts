import '@tanstack/react-start/server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/db'
import * as schema from '@/db/schema'

function createAuth() {
  return betterAuth({
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
