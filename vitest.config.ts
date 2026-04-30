import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

// Derive __dirname from import.meta.url (ESM — no __dirname in scope by default)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // @vitejs/plugin-react handles JSX transform so test files can use TSX syntax
  plugins: [react()],

  resolve: {
    // Mirror the @ alias from tsconfig.json so imports like '@/lib/api' resolve
    alias: {
      '@': __dirname,
    },
  },

  test: {
    // jsdom provides a browser-like DOM (window, document, fetch) for component tests
    environment: 'jsdom',

    // Run setup.ts before each test file to register jest-dom matchers
    setupFiles: ['__tests__/setup.ts'],

    // Expose describe/it/expect/vi globally — no need to import them in every test file
    globals: true,
  },
})
