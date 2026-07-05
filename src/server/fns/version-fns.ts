import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const getVersionCheck = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const { getRole } = await import('@/lib/roles')
  const { getVersionInfo } = await import('@/lib/server/version')

  const session = await auth.api.getSession({ headers: await getRequestHeaders() })
  if (!session || getRole(session) !== 'admin') throw new Error('Unauthorized')

  return getVersionInfo()
})
