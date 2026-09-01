import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'Амальгама',
        short_name: 'Амальгама',
        description: 'Амальгама',
        start_url: '/',
        display: 'standalone',
        background_color: '#05080d',
        theme_color: '#05080d',
        orientation: 'portrait',
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        globPatterns: [
          '**/*.{js,css,html,png,jpg,jpeg,webp,svg,gif,ico,woff,woff2}',
        ],

        navigateFallback: '/index.html',
      },
    }),
  ],

  server: {
    host: true,
    port: 5173,
  },
})