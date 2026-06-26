import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const TITLES: Record<string, string> = {
  PRIVACY: 'Privacy Policy - Surge FM',
  GDPR: 'GDPR Compliance - Surge FM',
}

export const fetchDoc = createServerFn({ method: 'GET' })
  .validator((page: string) => page)
  .handler(async ({ data: page }) => {
    const slug = page.toUpperCase()
    const docPath = join(process.cwd(), 'docs', `${slug}.md`)
    if (!existsSync(docPath)) return null
    return { markdownContent: readFileSync(docPath, 'utf8'), title: TITLES[slug] ?? `${slug} - OpenGifame` }
  })

export const docQueryOptions = (page: string) =>
  queryOptions({ queryKey: ['doc', page], queryFn: () => fetchDoc({ data: page }) })
