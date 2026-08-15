import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/chain-reaction/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inline rather than a separate <script src>: the registration is a few lines that
      // only attach a load listener, so putting them in the document costs nothing and
      // saves a request. It also makes the registration visible in the HTML source —
      // scanners (PWABuilder among them) look there and report "no service worker" when
      // the call is hidden behind an external, deferred file.
      injectRegister: 'inline',
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
