import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    // Tree-shaking automático: só inclui no bundle os componentes Vuetify usados nos templates
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['academy-icon-transparent.png', 'academy-emblem-transparent.png'],
      manifest: {
        id: '/',
        name: 'Future Academy',
        short_name: 'Future Academy',
        description: 'Seu espaço de aprendizado: caderno, disciplinas e rotina acadêmica.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#11161e',
        theme_color: '#14232d',
        icons: [
          { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cacheId: 'future-academy',
        cleanupOutdatedCaches: true,
        // Only build-time public assets enter this cache. Auth, APIs and user
        // documents always use the network and the existing per-account store.
        runtimeCaching: [],
        globPatterns: ['index.html', 'assets/*.{js,css,webp,svg,png,woff2}'],
        // Models, importers and spelling remain explicit, on-demand downloads.
        globIgnores: ['**/*worker*', 'assets/lib-*', 'assets/pdf-*', 'assets/mammoth*', 'assets/dist-*'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/auth(?:\/|$)/, /^\/redefinir-senha(?:\/|$)/, /\.[^/]+$/],
        skipWaiting: false,
        clientsClaim: false
      },
      devOptions: { enabled: false }
    })
  ],

  // Pré-bundling de deps pesadas no dev — evita centenas de requests separados
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      '@supabase/supabase-js',
      'gsap'
    ],
    // Não pré-bundilar libs de lazy load (anularia o Problema #5)
    exclude: ['pdf.js', 'mammoth']
  },

  build: {
    // Vite lida bem com a fragmentação automática
  },

  server: {
    port: 5173,
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/App.vue'
      ]
    },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
