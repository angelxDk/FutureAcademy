import { configureMonitoring } from './services/monitoring';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
// components e directives não são importados aqui — vite-plugin-vuetify faz tree-shaking automático
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import { router } from './router';
import './main.css';
import './workspace.css';

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#F2F4F7',
          surface: '#FFFFFF',
          'on-background': '#202A38',
          'on-surface': '#202A38',
          primary: '#895E31',
          secondary: '#626A49',
          accent: '#8C5E43',
          info: '#416A9F',
          success: '#24745E',
          warning: '#9A681E',
          error: '#A84E3C'
        }
      },
      dark: {
        dark: true,
        colors: {
          background: '#101722',
          surface: '#192331',
          'on-background': '#EDF2FA',
          'on-surface': '#EDF2FA',
          'on-primary': '#282216',
          'on-secondary': '#282216',
          primary: '#D5B167',
          secondary: '#E6C884',
          accent: '#B48F4A',
          info: '#60A5FA',
          success: '#72B99D',
          warning: '#F59E0B',
          error: '#E98989'
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

const app = createApp(App).use(vuetify).use(pinia).use(router);
configureMonitoring(app);
app.mount('#app');
