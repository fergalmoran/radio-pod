import { createFileRoute } from '@tanstack/react-router'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

export const Route = createFileRoute('/api/media/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        // path: /api/media/{type}/{filename}
        const parts = url.pathname.replace(/^\/api\/media\//, '').split('/')
        if (parts.length !== 2) return new Response('Not found', { status: 404 })

        const [type, filename] = parts
        const safe = basename(filename)

        if (safe !== filename || (type !== 'audio' && type !== 'image')) {
          return new Response('Not found', { status: 404 })
        }

        const dir = type === 'audio' ? process.env.AUDIO_DIR : process.env.IMAGE_DIR
        if (!dir) return new Response('Not configured', { status: 500 })

        const filepath = join(dir, safe)

        try {
          await stat(filepath)
          const buffer = await readFile(filepath)
          const contentType = MIME[extname(safe).toLowerCase()] ?? 'application/octet-stream'
          return new Response(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch {
          return new Response('Not found', { status: 404 })
        }
      },
    },
  },
})
