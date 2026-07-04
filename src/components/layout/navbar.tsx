import { Link, useRouteContext, useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { GoLiveDialog } from '@/components/widgets/go-live-dialog'
import { Icons } from '@/components/icons'
import { getRole, canSchedule } from '@/lib/roles'
import { useSiteSettings } from '@/lib/use-site-settings'

export const Navbar = () => {
  const { session } = useRouteContext({ from: '__root__' })
  const role = getRole(session)
  const navigate = useNavigate()
  const settings = useSiteSettings();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <img src="/logo.png" className="h-6 w-6" alt="" />
          {settings.name}
        </Link>

        <nav className="flex items-center gap-1 ml-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
            activeOptions={{ exact: true }}
          >
            <Icons.Radio className="h-4 w-4" />
            Live
          </Link>
          <Link
            to="/shows"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
          >
            <Icons.Mic className="h-4 w-4" />
            Shows
          </Link>
          <Link
            to="/listen-back"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
          >
            <Icons.History className="h-4 w-4" />
            Listen Back
          </Link>
          <Link
            to="/djs"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
          >
            <Icons.Users className="h-4 w-4" />
            DJs
          </Link>
          <Link
            to="/schedule"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
          >
            <Icons.Calendar className="h-4 w-4" />
            Schedule
          </Link>
          {session?.user && (
            <Link
              to="/saved"
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
              activeProps={{ className: 'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
            >
              <Icons.Bookmark className="h-4 w-4" />
              Saved
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {session?.user && canSchedule(role) && (
            <GoLiveDialog role={role} userId={session.user.id} />
          )}
          <ThemeToggle />
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image ?? undefined} />
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-sm font-medium">
                  {session.user.name}
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {session.user.email}
                </DropdownMenuItem>
                {role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer w-full">
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    authClient.signOut({
                      fetchOptions: { onSuccess: () => navigate({ to: '/' }) },
                    })
                  }
                  className="cursor-pointer"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/sign-in" className={buttonVariants({ size: 'sm' })}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
