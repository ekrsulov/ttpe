import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ??
    {}

  const basePath = env.BASE_PATH?.trim()

  const normalizedBase =
    basePath && basePath !== '/'
      ? `/${basePath.replace(/^\/+|\/+$/g, '')}/`
      : '/'

  return {
    base: normalizedBase,
    plugins: [react()],
    server: {
      host: '0.0.0.0'
    }
  }
})
