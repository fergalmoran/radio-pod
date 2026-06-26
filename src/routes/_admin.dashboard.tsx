import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_admin/dashboard')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage stations, shows, and users.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['Stations', 'Shows', 'Users'].map((label) => (
          <div key={label} className="border rounded-xl p-6 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
