import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
// components e directives não são importados aqui — vite-plugin-vuetify faz tree-shaking automático
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import { router } from './router';
import './main.css';

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#ECE2C5',
          surface: '#F5ECD3',
          'on-background': '#3F392C',
          'on-surface': '#3F392C',
          primary: '#895E31',
          secondary: '#626A49',
          accent: '#8C5E43',
          info: '#7B92B2',
          success: '#9F7E5F',
          warning: '#C8924F',
          error: '#A84E3C'
        }
      },
      dark: {
        dark: true,
        colors: {
          background: '#0B1120',
          surface: '#192332',
          'on-background': '#EEE2BF',
          'on-surface': '#EEE2BF',
          'on-primary': '#282216',
          'on-secondary': '#282216',
          primary: '#D5B167',
          secondary: '#E6C884',
          accent: '#B48F4A',
          info: '#60A5FA',
          success: '#5E72E4',
          warning: '#F59E0B',
          error: '#EF4444'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  }
});

const pinia = createPinia();

createApp(App).use(vuetify).use(pinia).use(router).mount('#app');
