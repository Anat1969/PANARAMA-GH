import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base so built assets resolve under the GitHub Pages project path
  // (https://<user>.github.io/<repo>/) as well as locally.
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
