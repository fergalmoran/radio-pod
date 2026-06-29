import type { UserRole } from '@/db/schema'
import type { Session } from '@/lib/auth'

export const getRole = (session: Session | null): UserRole => {
  if (!session) return 'user'
  return ((session.user as Record<string, unknown>).role as UserRole) ?? 'user'
}

export const canSchedule = (role: UserRole): boolean => {
  return role === 'admin' || role === 'editor' || role === 'dj'
}

export const canManageAllShows = (role: UserRole): boolean => {
  return role === 'admin' || role === 'editor'
}

export const canCreateShow = (role: UserRole): boolean => {
  return role === 'admin' || role === 'editor'
}
