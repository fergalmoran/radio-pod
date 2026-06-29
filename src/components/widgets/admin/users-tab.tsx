import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUsersQueryOptions } from '@/lib/queries/admin'
import { updateUserRole } from '@/server/fns/admin-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import type { UserRole } from '@/db/schema'

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  editor: 'Editor',
  dj: 'DJ / Host',
  admin: 'Admin',
}

const ALL_ROLES: UserRole[] = ['user', 'editor', 'dj', 'admin']

export function UsersTab() {
  const { data: users } = useSuspenseQuery(adminUsersQueryOptions)
  const queryClient = useQueryClient()

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole({ data: { userId, role } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  return (
    <div className="border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const initials = user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">
                  {user.email}
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
