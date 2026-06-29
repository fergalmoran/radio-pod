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
import { getRole } from '@/lib/roles'
import { useSiteSettings } from '@/lib/use-site-settings'

export function Navbar() {
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
            className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
            activeOptions={{ exact: true }}
          >
            Live
          </Link>
          <Link
            to="/shows"
            className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
          >
            Shows
          </Link>
          <Link
            to="/listen-back"
            className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
          >
            Listen Back
          </Link>
          <Link
            to="/schedule"
            className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
            activeProps={{ className: 'text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
          >
            Schedule
          </Link>
          {session?.user && (
            <Link
              to="/saved"
              className="text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
              activeProps={{ className: 'text-sm font-medium px-3 py-1.5 rounded-md bg-accent' }}
            >
              Saved
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
