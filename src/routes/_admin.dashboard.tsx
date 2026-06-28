import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { adminUsersQueryOptions } from '@/lib/queries/admin'
import { updateUserRole } from '@/server/fns/admin-fns'
import type { UserRole } from '@/db/schema'

export const Route = createFileRoute('/_admin/dashboard')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(adminUsersQueryOptions)
  },
  component: AdminDashboardPage,
})

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  editor: 'Editor',
  dh: 'DJ / Host',
  admin: 'Admin',
}

const ALL_ROLES: UserRole[] = ['user', 'editor', 'dh', 'admin']

function UsersTab() {
  const { data: users } = useSuspenseQuery(adminUsersQueryOptions)
  const queryClient = useQueryClient()

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole({ data: { userId, role } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => {
            const initials = user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            return (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm" className="shrink-0">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={user.role}
                    onValueChange={(role) =>
                      roleMutation.mutate({ userId: user.id, role: role as UserRole })
                    }
                    disabled={roleMutation.isPending}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin</h1>
        <p className="text-muted-foreground">Manage users and site settings.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Suspense
            fallback={
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/50 border-b px-4 py-3 flex gap-8">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3 border-b last:border-0">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            }
          >
            <UsersTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
