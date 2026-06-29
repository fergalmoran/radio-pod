import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { getSiteSettings } from '@/lib/server/site-settings'

const DOC_LABELS: Record<string, string> = {
  PRIVACY: 'Privacy Policy',
  GDPR: 'GDPR Compliance',
}

export const fetchDoc = createServerFn({ method: 'GET' })
  .validator((page: string) => page)
  .handler(async ({ data: page }) => {
    const slug = page.toUpperCase()
    const docPath = join(process.cwd(), 'docs', `${slug}.md`)
    if (!existsSync(docPath)) return null
    const { name: siteName } = await getSiteSettings()
    const label = DOC_LABELS[slug] ?? slug
    return { markdownContent: readFileSync(docPath, 'utf8'), title: `${label} - ${siteName}` }
  })

export const docQueryOptions = (page: string) =>
  queryOptions({ queryKey: ['doc', page], queryFn: () => fetchDoc({ data: page }) })
