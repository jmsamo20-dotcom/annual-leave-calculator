import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vercel: base='/', GitHub Pages: base='/annual-leave-calculator/'
const isVercel = process.env.VERCEL === '1'
const base = isVercel ? '/' : '/annual-leave-calculator/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
