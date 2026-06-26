import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('#/lib/auth')
  const session = await auth.api.getSession({
    headers: await getRequestHeaders(),
  })
  return session
})

export const requireSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('#/lib/auth')
  const session = await auth.api.getSession({
    headers: await getRequestHeaders(),
  })
  if (!session) {
    throw redirect({ to: '/sign-in' })
  }
  return session
})
