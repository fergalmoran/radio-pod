import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'

type CreateShowInput = {
  title: string
  description?: string
  imageUrl?: string
  hostName?: string
}

export const getShows = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { shows } = await import('@/db/schema')
  return db
    .select({
      id: shows.id,
      title: shows.title,
      slug: shows.slug,
      description: shows.description,
      hostName: shows.hostName,
      hostUserId: shows.hostUserId,
      imageUrl: shows.imageUrl,
      createdAt: shows.createdAt,
    })
    .from(shows)
    .orderBy(shows.title)
})

export const getShowsForUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const { db } = await import('@/db')
  const { shows } = await import('@/db/schema')
  const { getRole, canManageAllShows } = await import('@/lib/roles')

  const session = await auth.api.getSession({ headers: await getRequestHeaders() })
  if (!session) return [] as never[]

  const role = getRole(session)

  const cols = {
    id: shows.id,
    title: shows.title,
    slug: shows.slug,
    description: shows.description,
    hostName: shows.hostName,
    hostUserId: shows.hostUserId,
    imageUrl: shows.imageUrl,
    createdAt: shows.createdAt,
  }

  if (canManageAllShows(role)) {
    return db.select(cols).from(shows).orderBy(shows.title)
  }

  return db.select(cols).from(shows).where(eq(shows.hostUserId, session.user.id)).orderBy(shows.title)
})

export const createShow = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as CreateShowInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const { db } = await import('@/db')
    const { shows } = await import('@/db/schema')
    const { getRole, canCreateShow } = await import('@/lib/roles')

    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const role = getRole(session)
    if (!canCreateShow(role)) throw new Error('Forbidden')

    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const [show] = await db
      .insert(shows)
      .values({
        title: data.title,
        slug,
        description: data.description,
        imageUrl: data.imageUrl,
        hostName: data.hostName ?? session.user.name,
        hostUserId: session.user.id,
      })
      .returning()

    return { id: show.id }
  })
