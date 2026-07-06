import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

type SendMessageInput = {
  content?: string
  gifUrl?: string
  gifTitle?: string
  replyToId?: number
}

type DeleteMessageInput = {
  id: number
}

export const getChatMessages = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { chatMessages, users } = await import('@/db/schema')

  const replyMessages = alias(chatMessages, 'reply_msg')
  const replyUsers = alias(users, 'reply_user')

  const rows = await db
    .select({
      id: chatMessages.id,
      content: chatMessages.content,
      gifUrl: chatMessages.gifUrl,
      gifTitle: chatMessages.gifTitle,
      createdAt: chatMessages.createdAt,
      replyToId: chatMessages.replyToId,
      userId: users.id,
      userName: users.name,
      userImage: users.image,
      replyToContent: replyMessages.content,
      replyToGifTitle: replyMessages.gifTitle,
      replyToUserName: replyUsers.name,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .leftJoin(replyMessages, eq(chatMessages.replyToId, replyMessages.id))
    .leftJoin(replyUsers, eq(replyMessages.userId, replyUsers.id))
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
      replyToId: data.replyToId ?? null,
    })
  })

export const deleteChatMessage = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as DeleteMessageInput)
  .handler(async ({ data }) => {
    const { auth } = await import('@/lib/auth')
    const session = await auth.api.getSession({ headers: await getRequestHeaders() })
    if (!session) throw new Error('Unauthorized')

    const isAdmin = (session.user as { role?: string }).role === 'admin'

    const { db } = await import('@/db')
    const { chatMessages } = await import('@/db/schema')
    await db
      .delete(chatMessages)
      .where(
        isAdmin
          ? eq(chatMessages.id, data.id)
          : and(eq(chatMessages.id, data.id), eq(chatMessages.userId, session.user.id)),
      )
  })

export const getChatUsers = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { users } = await import('@/db/schema')
  return db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .limit(200)
})
