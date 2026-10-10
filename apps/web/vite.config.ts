import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Adresse publique (QR codes, liens à partager) : VITE_PUBLIC_URL, sinon le domaine de production fourni par Vercel au build.
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL
const publicUrl = process.env.VITE_PUBLIC_URL ?? (vercelDomain ? `https://${vercelDomain}` : '')

// https://vite.dev/config/
export default defineConfig({
  define: { __PUBLIC_URL__: JSON.stringify(publicUrl) },
  plugins: [
    react(),
    VitePWA({
      // Mise à jour automatique : un nouvel envoi en production remplace l'ancienne version à l'ouverture suivante.
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Capture et Gagne',
        short_name: 'Capture et Gagne',
        description: 'Le concours photo et vidéo de l’association Ambyans Twopikal',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone', // plein écran, sans barre d'adresse
        orientation: 'portrait',
        theme_color: '#e33e3d',
        background_color: '#fdf8f1',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Hors ligne partiel : seule la coquille de l'app (pages, scripts, styles, images, polices) est gardée.
        // Aucune requête vers Supabase (données, connexion, envois TUS) n'est mise en cache ni interceptée.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [],
      },
    }),
  ],
})
