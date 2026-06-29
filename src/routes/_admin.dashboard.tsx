import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { adminUsersQueryOptions, mailSettingsQueryOptions, siteSettingsQueryOptions } from '@/lib/queries/admin'
import { UsersTab } from '@/components/widgets/admin/users-tab'
import { MailSettingsTab } from '@/components/widgets/admin/mail-settings-tab'
import { SiteSettingsTab } from '@/components/widgets/admin/site-settings-tab'

const AdminDashboardPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin</h1>
        <p className="text-muted-foreground">Manage users and site settings.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="mail">Mail</TabsTrigger>
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

        <TabsContent value="site" className="pt-4">
          <Suspense fallback={<div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full max-w-lg rounded" />)}</div>}>
            <SiteSettingsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="mail" className="pt-4">
          <Suspense fallback={<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full max-w-lg rounded" />)}</div>}>
            <MailSettingsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const Route = createFileRoute('/_admin/dashboard')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(adminUsersQueryOptions),
      context.queryClient.ensureQueryData(mailSettingsQueryOptions),
      context.queryClient.ensureQueryData(siteSettingsQueryOptions),
    ])
  },
  component: AdminDashboardPage,
})
