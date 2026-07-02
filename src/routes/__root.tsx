import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { getContext } from '@/integrations/tanstack-query/root-provider'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { PlayerBar } from '@/components/layout/player-bar'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import appCss from '@/app.css?url'
import { getSession } from '@/server/fns/auth-fns'
import type { Session } from '@/lib/auth'
import { TooltipProvider } from '@/components/ui/tooltip'
import { publicSiteSettingsQueryOptions } from '@/lib/queries/site-settings'
import { siteSettings as defaults } from '@/lib/site-settings'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);root.style.colorScheme=resolved;}catch(e){}})();`

interface RouterContext {
  queryClient: QueryClient
  session: Session | null
}

const { queryClient } = getContext()

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}

const RootLayout = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto container mx-auto py-6 px-4 pb-24">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
    </div>
  )
}

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
    </div>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const session = await getSession()
    return { session }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(publicSiteSettingsQueryOptions),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: loaderData?.name ?? defaults.name },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      ...(loaderData?.faviconUrl
        ? [{ rel: 'icon', href: loaderData.faviconUrl }]
        : []),
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})
