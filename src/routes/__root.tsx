import { Suspense, useRef } from 'react'
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
import { LiveHero } from '@/components/widgets/live-hero'
import { OnAirNow } from '@/components/widgets/on-air-now'
import { UpNext } from '@/components/widgets/up-next'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import appCss from '@/app.css?url'
import { getSession } from '@/server/fns/auth-fns'
import type { Session } from '@/lib/auth'
import { TooltipProvider } from '@/components/ui/tooltip'
import { publicSiteSettingsQueryOptions } from '@/lib/queries/site-settings'
import { siteSettings as defaults } from '@/lib/site-settings'
import { useNowPlaying } from '@/lib/use-now-playing'
import { useHlsVideo } from '@/lib/use-hls-video'

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
      <body className="min-h-dvh bg-background font-sans antialiased" suppressHydrationWarning>
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
  // Shared across LiveHero (picture) and PlayerBar (site-wide audio control) so
  // there's exactly one HLS connection driving both — keeps them frame-accurate
  // instead of two independent pulls of the same stream drifting apart.
  const nowPlaying = useNowPlaying()
  const videoRef = useRef<HTMLVideoElement>(null)
  const isLive = nowPlaying?.type === 'live'
  const { levels, currentLevel, setLevel } = useHlsVideo(videoRef, isLive ? nowPlaying?.hlsUrl : undefined)

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto container mx-auto py-4 sm:py-6 px-3 sm:px-4 pb-24 space-y-4 sm:space-y-6">
          <div className="lg:hidden space-y-3">
            <OnAirNow />
            <Suspense fallback={<Skeleton className="h-16 w-full rounded-lg" />}>
              <UpNext />
            </Suspense>
          </div>
          <LiveHero
            nowPlaying={nowPlaying}
            videoRef={videoRef}
            levels={levels}
            currentLevel={currentLevel}
            setLevel={setLevel}
          />
          <Outlet />
        </main>
      </div>
      <PlayerBar nowPlaying={nowPlaying} videoRef={videoRef} />
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
