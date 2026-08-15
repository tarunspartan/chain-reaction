import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/chain-reaction/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // the default injects a blocking <script> in the head; nothing on the first paint
      // depends on the service worker, so let it register after the document parses
      injectRegister: 'script-defer',
      // the hand-written manifest in public/manifest.json is kept as-is
      manifest: false,
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png', 'manifest.json'],
      workbox: {
        // woff2 included so the installed app still has its fonts offline
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,mp3,woff2}'],
        // autoUpdate skips the waiting phase, but without claiming clients the new
        // worker still doesn't control the open page — the tab keeps serving the old
        // assets until the next navigation, and Chrome won't count the page as
        // service-worker-controlled when it decides whether to offer an install
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ]
})
