import { defineConfig } from 'vite'
import { readFileSync, existsSync } from 'fs'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const CERT_DIR = '/etc/letsencrypt/live/dev.fergl.ie'
const hasCerts = existsSync(`${CERT_DIR}/privkey.pem`)

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    ...(hasCerts && {
      https: {
        key: readFileSync(`${CERT_DIR}/privkey.pem`),
        cert: readFileSync(`${CERT_DIR}/fullchain.pem`),
      },
      allowedHosts: ['radio-pod.dev.fergl.ie'],
    }),
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
