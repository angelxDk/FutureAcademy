import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  plugins: [
    vue(),
    // Tree-shaking automático: só inclui no bundle os componentes Vuetify usados nos templates
    vuetify({ autoImport: true })
  ],

  // Pré-bundling de deps pesadas no dev — evita centenas de requests separados
  /*
  optimizeDeps: {
    include: [
      'vue',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'gsap'
    ]
  },
  */

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
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
