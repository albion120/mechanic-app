import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: { setupFiles: ['./src/test-setup.js'], exclude: ['**/node_modules/**', '**/e2e/**'] },
})
