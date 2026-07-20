import { useRef } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
  useRouteContext,
  useRouterState,
} from '@tanstack/react-router'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { LiveHero } from '@/components/widgets/live-hero'
import { OnAirNow } from '@/components/widgets/on-air-now'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import appCss from '@/app.css?url'
import { getSession } from '@/server/fns/auth-fns'
import type { Session } from '@/lib/auth'
import { TooltipProvider } from '@/components/ui/tooltip'
import { publicSiteSettingsQueryOptions } from '@/lib/queries/site-settings'
import { upNextQueryOptions } from '@/lib/queries'
import { siteSettings as defaults } from '@/lib/site-settings'
import { useNowPlaying } from '@/lib/use-now-playing'
import { useHlsVideo } from '@/lib/use-hls-video'
import { useRadioAudio } from '@/lib/use-radio-audio'
import { cn } from '@/lib/utils'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var resolved=(stored==='light'||stored==='dark')?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);root.style.colorScheme=resolved;}catch(e){}})();`

interface RouterContext {
  queryClient: QueryClient
  session: Session | null
}

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  // Read from route context (set up fresh per request by getRouter()) rather
  // than calling getContext() at module scope — a top-level call only runs
  // once per server process and would freeze to whichever request first
  // loaded this module, desyncing the provider's client from the one
  // loaders actually populate for later requests.
  const { queryClient } = useRouteContext({ from: '__root__' })

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
  // Shared across LiveHero (video) and useRadioAudio (background audio) so
  // there's exactly one HLS connection and one audio element driving both —
  // keeps them frame-accurate instead of independent pulls of the same stream.
  const nowPlaying = useNowPlaying()
  const videoRef = useRef<HTMLVideoElement>(null)
  const isLive = nowPlaying?.type === 'live'
  const { levels, currentLevel, setLevel } = useHlsVideo(videoRef, isLive ? nowPlaying?.hlsUrl : undefined)
  const { audioRef, isPlaying, togglePlay, streamUrl, volume, setVolume } = useRadioAudio(videoRef, nowPlaying)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // On the home page while live, pair the video with chat side-by-side and fit
  // both to the viewport at lg+ instead of stacking them (which pushed chat
  // below the fold and forced scrolling to see the whole stream).
  const isTheater = isLive && pathname === '/'

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Navbar nowPlaying={nowPlaying} />
      <audio ref={audioRef} src={streamUrl} />
      <div className="flex flex-1 min-h-0">
        <Sidebar nowPlaying={nowPlaying} isPlaying={isPlaying} onTogglePlay={togglePlay} volume={volume} onVolumeChange={setVolume} />
        <main
          className={cn(
            'flex-1 overflow-y-auto container mx-auto py-4 sm:py-6 px-3 sm:px-4 flex flex-col min-h-0 space-y-4 sm:space-y-6',
            isTheater && 'lg:overflow-hidden lg:space-y-0'
          )}
        >
          <div className="lg:hidden">
            <OnAirNow nowPlaying={nowPlaying} isPlaying={isPlaying} onTogglePlay={togglePlay} volume={volume} onVolumeChange={setVolume} />
          </div>
          {isTheater ? (
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
              <div className="lg:flex-1 lg:min-w-0 lg:min-h-0">
                <LiveHero
                  nowPlaying={nowPlaying}
                  videoRef={videoRef}
                  levels={levels}
                  currentLevel={currentLevel}
                  setLevel={setLevel}
                  fillHeight
                />
              </div>
              <div className="flex-1 min-h-0 lg:flex-none lg:w-96 lg:shrink-0">
                <Outlet />
              </div>
            </div>
          ) : (
            <>
              <LiveHero
                nowPlaying={nowPlaying}
                videoRef={videoRef}
                levels={levels}
                currentLevel={currentLevel}
                setLevel={setLevel}
              />
              <Outlet />
            </>
          )}
        </main>
      </div>
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
  loader: async ({ context }) => {
    const [siteSettings] = await Promise.all([
      context.queryClient.ensureQueryData(publicSiteSettingsQueryOptions),
      context.queryClient.ensureQueryData(upNextQueryOptions),
    ])
    return siteSettings
  },
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
