import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

const isProd = process.env.NODE_ENV === 'production'
config({ path: isProd ? '.env.production' : ['.env.local', '.env'] })

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
