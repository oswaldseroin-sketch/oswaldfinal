import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
  registerType: 'prompt',

  manifest: {
        name: 'Амальгама',
        short_name: 'Амальгама',
        start_url: '/',
        display: 'standalone',
        background_color: '#0d0e12',
        theme_color: '#0d0e12',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },

      workbox: {
        globPatterns: [],
      },
    }),
  ],

  server: {
    host: true,
    port: 5173,
  },
})