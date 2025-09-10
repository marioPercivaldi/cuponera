import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 5173
  },
  build: {
    outDir: '../backend/build',
    emptyOutDir: true
  }
})