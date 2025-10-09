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
    // Include .bin files as static assets
    assetsInclude: ['**/*.bin'],
    server: {
      host: '0.0.0.0',
      // Configure MIME types for TensorFlow.js model files
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React core libraries
            'react-vendor': ['react', 'react-dom'],
            // State management
            'state-vendor': ['zustand', 'zundo'],
            // Vector graphics (Paper.js is quite large)
            'paper-vendor': ['paper'],
            // Icons
            'icons-vendor': ['lucide-react'],
            // Image processing
            'image-vendor': ['esm-potrace-wasm', 'path-data-parser'],
            // Utilities
            'utils-vendor': ['fast-deep-equal']
          },
          // Ensure .bin files are copied as-is
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.bin')) {
              return 'models/optical-alignment/[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          }
        }
      },
      // Increase chunk size warning limit to 750KB
      chunkSizeWarningLimit: 750,
      // Copy public directory assets
      copyPublicDir: true
    }
  }
})
