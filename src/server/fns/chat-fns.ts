import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'

type SendMessageInput = {
  content?: string
  gifUrl?: string
  gifTitle?: string
}

export const getChatMessages = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { chatMessages, users } = await import('@/db/schema')
  const rows = await db
    .select({
      id: chatMessages.id,
      content: chatMessages.content,
      gifUrl: chatMessages.gifUrl,
      gifTitle: chatMessages.gifTitle,
      createdAt: chatMessages.createdAt,
      userId: users.id,
      userName: users.name,
      userImage: users.image,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(50)
  return rows.reverse()
})

export const sendChatMessage = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as SendMessageInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')
    if (!data.content?.trim() && !data.gifUrl) throw new Error('Empty message')

    const { db } = await import('@/db')
    const { chatMessages } = await import('@/db/schema')
    await db.insert(chatMessages).values({
      userId: session.user.id,
      content: data.content?.trim() || null,
      gifUrl: data.gifUrl || null,
      gifTitle: data.gifTitle || null,
    })
  })

export const getChatUsers = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { users } = await import('@/db/schema')
  return db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .limit(200)
})
