import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // the hand-written manifest in public/manifest.json is kept as-is
      manifest: false,
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png', 'manifest.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,mp3}']
      }
    })
  ]
})
