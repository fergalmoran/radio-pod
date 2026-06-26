import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Navbar } from '#/components/layout/Navbar'
import { Sidebar } from '#/components/layout/Sidebar'
import { PlayerBar } from '#/components/layout/PlayerBar'
import { Toaster } from '#/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import appCss from '#/app.css?url'
import { getSession } from '#/server/fns/auth-fns'
import type { Session } from '#/lib/auth'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);root.style.colorScheme=resolved;}catch(e){}})();`

interface RouterContext {
  queryClient: QueryClient
  session: Session | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'radio-pod' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async () => {
    const session = await getSession()
    return { session }
  },
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 container mx-auto py-6 px-4 pb-24">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
    </div>
  )
}
