import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],

  // Pré-bundling de deps pesadas — evita centenas de requests separados no dev
  optimizeDeps: {
    include: [
      'vue',
      'vuetify',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'gsap'
    ]
  },

  build: {
    // Dividir vendors em chunks separados → melhor cache em produção
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue':      ['vue', 'vuetify'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-gsap':     ['gsap']
        }
      }
    }
  },

  server: {
    port: 5173,
    // Pré-aquecer os módulos mais usados no dev
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/App.vue',
        './src/appOptions.js'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
