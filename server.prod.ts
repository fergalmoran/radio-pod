import { join } from 'path'
import serverModule from './dist/server/server.js'

const PUBLIC_DIR = join(import.meta.dir, 'dist/client')

const MIME: Record<string, string> = {
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webp': 'image/webp',
}

function mimeType(path: string): string {
  const ext = path.match(/\.[^.]+$/)?.[0] ?? ''
  return MIME[ext] ?? 'application/octet-stream'
}

Bun.serve({
  port: parseInt(process.env.PORT ?? '3000'),
  async fetch(req) {
    const url = new URL(req.url)
    const filePath = join(PUBLIC_DIR, url.pathname)
    const file = Bun.file(filePath)

    if (await file.exists()) {
      return new Response(file, {
        headers: {
          'Content-Type': mimeType(url.pathname),
          'Cache-Control': url.pathname.startsWith('/assets/')
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600',
        },
      })
    }

    return serverModule.fetch(req)
  },
})

console.log(`Started server: http://localhost:${process.env.PORT ?? 3000}`)
