import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Use root path in local dev, repo path on production builds (e.g. GitHub Pages)
  base: command === 'serve' ? '/' : '/Cupido/',
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5177,
    strictPort: true,
  },
}))
