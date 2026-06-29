import '@tanstack/react-start/server-only'
import postgres from 'postgres'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { Pool } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import * as schema from './schema.ts'

function createDb() {
  if (process.env.DATABASE_DRIVER === 'neon') {
    return drizzleNeon(new Pool({ connectionString: process.env.DATABASE_URL }), { schema })
  }
  return drizzlePg(postgres(process.env.DATABASE_URL!), { schema })
}

let _db: ReturnType<typeof createDb> | undefined

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop) {
    if (!_db) _db = createDb()
    return _db[prop as keyof ReturnType<typeof createDb>]
  },
})
