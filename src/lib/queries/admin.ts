import { queryOptions } from '@tanstack/react-query'
import { getAdminUsers } from '@/server/fns/admin-fns'

export const adminUsersQueryOptions = queryOptions({
  queryKey: ['admin', 'users'],
  queryFn: () => getAdminUsers(),
})
