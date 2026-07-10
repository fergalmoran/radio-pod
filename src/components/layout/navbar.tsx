import { useState } from 'react'
import { Link, useRouteContext, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
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
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { LiveClock } from '@/components/layout/live-clock'
import { GoLiveDialog } from '@/components/widgets/go-live-dialog'
import { Icons } from '@/components/icons'
import { getRole, canSchedule } from '@/lib/roles'
import { useSiteSettings } from '@/lib/use-site-settings'
import { versionCheckQueryOptions } from '@/lib/queries'

const NAV_LINK_CLASS =
  'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-accent transition-colors'
const NAV_LINK_ACTIVE_CLASS =
  'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-accent'

type NavLinksProps = {
  showSaved: boolean
  onNavigate?: () => void
}

const NavLinks = ({ showSaved, onNavigate }: NavLinksProps) => (
  <>
    <Link
      to="/"
      className={NAV_LINK_CLASS}
      activeProps={{ className: NAV_LINK_ACTIVE_CLASS }}
      activeOptions={{ exact: true }}
      onClick={onNavigate}
    >
      <Icons.Radio className="h-4 w-4" />
      Live
    </Link>
    <Link to="/shows" className={NAV_LINK_CLASS} activeProps={{ className: NAV_LINK_ACTIVE_CLASS }} onClick={onNavigate}>
      <Icons.Mic className="h-4 w-4" />
      Shows
    </Link>
    <Link to="/listen-back" className={NAV_LINK_CLASS} activeProps={{ className: NAV_LINK_ACTIVE_CLASS }} onClick={onNavigate}>
      <Icons.History className="h-4 w-4" />
      Listen Back
    </Link>
    <Link to="/djs" className={NAV_LINK_CLASS} activeProps={{ className: NAV_LINK_ACTIVE_CLASS }} onClick={onNavigate}>
      <Icons.Users className="h-4 w-4" />
      DJs
    </Link>
    <Link to="/schedule" className={NAV_LINK_CLASS} activeProps={{ className: NAV_LINK_ACTIVE_CLASS }} onClick={onNavigate}>
      <Icons.Calendar className="h-4 w-4" />
      Schedule
    </Link>
    {showSaved && (
      <Link to="/saved" className={NAV_LINK_CLASS} activeProps={{ className: NAV_LINK_ACTIVE_CLASS }} onClick={onNavigate}>
        <Icons.Bookmark className="h-4 w-4" />
        Saved
      </Link>
    )}
  </>
)

export const Navbar = () => {
  const { session } = useRouteContext({ from: '__root__' })
  const role = getRole(session)
  const navigate = useNavigate()
  const settings = useSiteSettings();
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: versionCheck } = useQuery({ ...versionCheckQueryOptions, enabled: role === 'admin' })
  const updateAvailable = versionCheck?.updateAvailable ?? false
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 items-center gap-2 sm:gap-4 px-3 sm:px-4">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Open menu">
              <Icons.Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle>{settings.name}</SheetTitle>
            <nav className="flex flex-col gap-1 mt-4">
              <NavLinks showSaved={!!session?.user} onNavigate={() => setMenuOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2 font-bold text-lg min-w-0 shrink">
          <img src="/logo.png" className="h-6 w-6 shrink-0" alt="" />
          <span className="truncate">{settings.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          <NavLinks showSaved={!!session?.user} />
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {role === 'admin' && (
            <>
              <LiveClock />
              <Separator orientation="vertical" className="h-6 hidden lg:block" />
            </>
          )}
          {session?.user && canSchedule(role) && (
            <div className="hidden md:block">
              <GoLiveDialog role={role} userId={session.user.id} />
            </div>
          )}
          <ThemeToggle />
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 p-0 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image ?? undefined} />
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {updateAvailable && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                  )}
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
                    <DropdownMenuItem asChild>
                      <Link to="/debug" className="cursor-pointer w-full">
                        Debug: Now Playing
                      </Link>
                    </DropdownMenuItem>
                    {updateAvailable && (
                      <DropdownMenuItem asChild>
                        <a
                          href={versionCheck?.releaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer w-full text-primary"
                        >
                          Update available: {versionCheck?.latest}
                        </a>
                      </DropdownMenuItem>
                    )}
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
