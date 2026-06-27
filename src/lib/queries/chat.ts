import { queryOptions } from '@tanstack/react-query'
import { getChatMessages, getChatUsers } from '@/server/fns/chat-fns'

export const chatMessagesQueryOptions = queryOptions({
  queryKey: ['chat', 'messages'],
  queryFn: () => getChatMessages(),
  refetchInterval: 3000,
})

export const chatUsersQueryOptions = queryOptions({
  queryKey: ['chat', 'users'],
  queryFn: () => getChatUsers(),
  staleTime: 60_000,
})
