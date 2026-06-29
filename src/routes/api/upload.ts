import { createFileRoute } from '@tanstack/react-router'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { auth } = await import('@/lib/auth')
        const { getRole, canSchedule } = await import('@/lib/roles')

        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) return new Response('Unauthorized', { status: 401 })
        if (!canSchedule(getRole(session))) return new Response('Forbidden', { status: 403 })

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const type = formData.get('type') as string | null

        if (!file || !type) return new Response('Missing file or type', { status: 400 })
        if (type !== 'audio' && type !== 'image') return new Response('Invalid type', { status: 400 })

        const ALLOWED_AUDIO = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'])
        const ALLOWED_IMAGE = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'])

        const ext = extname(file.name).toLowerCase()
        const allowed = type === 'audio' ? ALLOWED_AUDIO : ALLOWED_IMAGE
        if (!allowed.has(ext)) return new Response('Invalid file type', { status: 400 })

        const dir = type === 'audio' ?
          `${process.env.AUDIO_DIR}` :
          process.env.IMAGE_DIR

        if (!dir) return new Response('Storage directory not configured', { status: 500 })

        await mkdir(dir, { recursive: true })

        const filename = `${randomUUID()}${ext}`
        await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))

        return Response.json({ url: `/api/media/${type}/${filename}` })
      },
    },
  },
})
