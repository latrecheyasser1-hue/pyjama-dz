import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      selfDestroying: true,
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'PyjamaDZ Store',
        short_name: 'PyjamaDZ',
        description: 'متجر بيجامات الجزائر - ملابس نوم فاخرة',
        theme_color: '#8B1818',
        background_color: '#8B1818',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('node_modules/xlsx') || id.includes('node_modules/canvas-confetti')) {
            return 'vendor-admin-utils';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
        }
      }
    }
  }
})
