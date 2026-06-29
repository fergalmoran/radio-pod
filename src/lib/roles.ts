import type { UserRole } from '@/db/schema'
import type { Session } from '@/lib/auth'

export function getRole(session: Session | null): UserRole {
  if (!session) return 'user'
  return ((session.user as Record<string, unknown>).role as UserRole) ?? 'user'
}

export function canSchedule(role: UserRole): boolean {
  return role === 'admin' || role === 'editor' || role === 'dj'
}

export function canManageAllShows(role: UserRole): boolean {
  return role === 'admin' || role === 'editor'
}

export function canCreateShow(role: UserRole): boolean {
  return role === 'admin' || role === 'editor'
}
