import { defineConfig } from 'drizzle-kit'

if (process.env.NODE_ENV !== 'production') {
  const { config } = require('dotenv')
  config({ path: ['.env.local', '.env'] })
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
