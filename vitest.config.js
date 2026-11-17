import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { 'virtual:pwa-register/vue': fileURLToPath(new URL('./tests/support/pwa-register.js', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['tests/*.spec.js'], restoreMocks: true }
});
