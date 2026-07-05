import { queryOptions } from '@tanstack/react-query'
import { getVersionCheck } from '@/server/fns/version-fns'

export const versionCheckQueryOptions = queryOptions({
  queryKey: ['version-check'],
  queryFn: () => getVersionCheck(),
  refetchInterval: 30 * 60_000,
})
