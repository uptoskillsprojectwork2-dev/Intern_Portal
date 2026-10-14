import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^grapesjs$/, replacement: 'grapesjs/dist/grapes.min.js' },
    ],
  },
  optimizeDeps: {
    include: ['@reduxjs/toolkit'],
  },
  build: {
    cssMinify: false,
  },
})
