<template>
  <v-app :theme="userStore.settings.theme" :class="['app-root', `theme-${userStore.settings.theme}`]" style="background: transparent !important;">
    <canvas id="bg-canvas-3d" class="three-bg" aria-hidden="true"></canvas>

    <v-main style="position: relative; z-index: 10;">
      <v-container fluid class="py-6">
        <div v-if="authLoading" class="d-flex flex-column align-center justify-center" style="min-height: 70vh; gap: 16px">
          <v-progress-circular indeterminate size="48" color="primary" />
          <p class="text-medium-emphasis">Carregando Future Academy...</p>
        </div>

        <v-row v-else-if="!authUser" justify="center" align="center" style="min-height: 80vh">
          <v-col cols="12" sm="8" md="6" lg="4">
            <div class="glass-card px-8 py-10">
              <div class="text-center mb-8">
                <div class="app-logo-wrap app-logo-wrap--login">
                  <img src="./logo.png" alt="Future Academy" class="logo-light" style="height: 96px; width: auto;" />
                  <img src="./logo-dark-theme.png" alt="Future Academy" class="logo-dark" style="height: 96px; width: auto;" />
                </div>
                <p class="text-sm text-medium-emphasis mt-1">{{ authMode === 'login' ? 'Entre para continuar estudando!' : 'Crie sua conta gratuitamente' }}</p>
              </div>

              <div class="grid gap-3">
                <v-btn color="primary" variant="flat" prepend-icon="mdi-google" @click="loginWithGoogle" block class="font-semibold" height="48" style="justify-content: flex-start;">{{ authMode === 'login' ? 'Continuar com Google' : 'Cadastrar com Google' }}</v-btn>
                <v-btn color="secondary" variant="outlined" prepend-icon="mdi-facebook" @click="loginWithFacebook" block height="48" style="justify-content: flex-start;">{{ authMode === 'login' ? 'Continuar com Facebook' : 'Cadastrar com Facebook' }}</v-btn>
              </div>

              <div style="display: flex; align-items: center; gap: 16px; margin: 28px 0;">
                <v-divider />
                <span style="white-space: nowrap; font-size: 0.75rem; color: var(--app-muted); flex-shrink: 0; font-weight: 500; letter-spacing: 0.04em;">ou use seu e-mail</span>
                <v-divider />
              </div>

              <v-form @submit.prevent="loginWithEmail(authMode, authName, authPasswordConfirm)" class="grid gap-4">
                <v-text-field v-if="authMode === 'register'" v-model.trim="authName" label="Nome completo" variant="outlined" density="comfortable" bg-color="transparent" color="primary" hide-details="auto" />
                <v-text-field v-model.trim="authEmail" label="E-mail" type="email" variant="outlined" density="comfortable" bg-color="transparent" color="primary" hide-details="auto" />
                <v-text-field v-model="authPassword" label="Senha" type="password" variant="outlined" density="comfortable" bg-color="transparent" color="primary" hide-details="auto" />
                <v-text-field v-if="authMode === 'register'" v-model="authPasswordConfirm" label="Confirmar senha" type="password" variant="outlined" density="comfortable" bg-color="transparent" color="primary" hide-details="auto" />
                <v-btn type="submit" color="primary" variant="flat" height="48" class="font-semibold mt-1">{{ authMode === 'login' ? 'Entrar' : 'Criar conta' }}</v-btn>
              </v-form>

              <p class="text-center text-sm mt-6 mb-0">
                <span class="text-medium-emphasis">{{ authMode === 'login' ? 'Não tem conta?' : 'Já tem uma conta?' }}</span>
                <a href="#" class="font-semibold" style="color: rgb(var(--gold-500)); margin-left: 4px;" @click.prevent="authMode = authMode === 'login' ? 'register' : 'login'">
                  {{ authMode === 'login' ? 'Criar conta' : 'Entrar' }}
                </a>
              </p>
            </div>
          </v-col>
        </v-row>

        <template v-else>
          <header class="app-header glass-card mb-6">
            <div class="app-header__left">
              <div class="app-logo-wrap">
                <img src="./logo.png" alt="Future Academy" class="app-header__logo logo-light" />
                <img src="./logo-dark-theme.png" alt="Future Academy" class="app-header__logo logo-dark" />
              </div>
              <div class="app-header__titles">
                <h1 class="app-header__title">Hub Acadêmico</h1>
                <p class="app-header__subtitle">Foco em organização</p>
              </div>
            </div>

            <div class="app-header__right">
              <div class="user-profile-chip">
                <v-avatar size="32" class="user-avatar-img">
                  <v-img :src="profile.photo || authUser.photo" :alt="authUser.name" cover />
                </v-avatar>
                <span class="user-profile-name">{{ (profile.name || authUser.name).split(' ')[0] }}</span>
              </div>

              <button class="theme-toggle" :class="{ 'theme-toggle--light': settings.theme === 'light' }" @click="toggleTheme" :title="settings.theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'">
                <span class="theme-toggle__icon" :key="settings.theme">
                  <!-- Sol (tema light / classic) -->
                  <svg v-if="settings.theme !== 'dark'" class="theme-icon theme-icon--sun" viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g class="sun-rays-group">
                      <line x1="12" y1="2"    x2="12" y2="5.5"  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="12" y1="18.5" x2="12" y2="22"   stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="2"  y1="12"   x2="5.5" y2="12"  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="18.5" y1="12" x2="22" y2="12"   stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="4.93" y1="4.93"   x2="7.05"  y2="7.05"  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="19.07" y1="4.93"  x2="16.95" y2="7.05"  stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <line x1="7.05"  y1="16.95" x2="4.93"  y2="19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </g>
                    <circle cx="12" cy="12" r="4.5" fill="currentColor"/>
                  </svg>
                  <!-- Lua (tema dark) -->
                  <svg v-else class="theme-icon theme-icon--moon" viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
                    <circle cx="17.5" cy="5"   r="0.9" fill="currentColor" opacity="0.55"/>
                    <circle cx="20"   cy="9.5" r="0.6" fill="currentColor" opacity="0.38"/>
                    <circle cx="15"   cy="2.5" r="0.5" fill="currentColor" opacity="0.3"/>
                  </svg>
                </span>
              </button>

              <v-btn variant="outlined" color="primary" prepend-icon="mdi-bell" size="small" @click="enableNotifications">
                {{ notificationsEnabledLabel }}
              </v-btn>
              <v-btn variant="outlined" color="error" prepend-icon="mdi-logout" size="small" @click="showLogoutDialog = true">Sair</v-btn>
            </div>
          </header>

          <v-row>
            <v-col cols="12" md="3" lg="2">
              <div class="glass-card p-3 h-full">
                <v-list density="compact" nav bg-color="transparent">
                  <template v-for="(item, idx) in navItems" :key="item.id || `sep-${idx}`">
                    <v-divider v-if="item.separator" class="my-2" />
                    <v-list-item
                      v-else
                      :title="item.label"
                      :active="$route.name === item.id"
                      rounded="lg"
                      color="primary"
                      class="mb-1 nav-item"
                      @click="router.push({ name: item.id })"
                    >
                      <template v-slot:prepend>
                        <div v-html="item.icon" class="mr-3 d-flex align-center justify-center" style="width: 1.5rem; height: 1.5rem;" :class="{ 'text-primary': $route.name === item.id, 'text-medium-emphasis': $route.name !== item.id }"></div>
                      </template>
                    </v-list-item>
                  </template>
                </v-list>
              </div>
            </v-col>

            <v-col cols="12" md="9" lg="10">
              <div ref="sectionContent">
                <Suspense>
                  <router-view v-slot="{ Component }">
                    <KeepAlive :max="6">
                      <component :is="Component" />
                    </KeepAlive>
                  </router-view>
                  <template #fallback>
                    <div class="glass-card p-12 text-center flex flex-col items-center justify-center">
                      <v-progress-circular indeterminate color="primary" size="48" width="4" />
                      <p class="text-sm text-medium-emphasis mt-4 mb-0 font-medium tracking-wide">Iniciando interface...</p>
                    </div>
                  </template>
                </Suspense>
              </div>
            </v-col>
          </v-row>
        </template>
      </v-container>
    </v-main>

    <v-card
      v-if="authUser"
      rounded="xl"
      elevation="10"
      class="spotify-dock"
      :class="{
        'spotify-dock--collapsed': focusPlayer.collapsed,
        'spotify-dock--hidden': !focusPlayer.visible
      }"
    >
      <div class="spotify-dock__header">
        <div class="spotify-dock__title">
          <v-icon icon="mdi-spotify" size="18" />
          <span class="text-caption font-weight-bold text-truncate">
            {{ activeFocusPlaylist?.name || 'Spotify Player' }}
          </span>
        </div>
        <div class="d-flex" style="gap: 6px">
          <v-btn
            size="x-small"
            variant="text"
            color="secondary"
            :icon="focusPlayer.collapsed ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            @click="toggleFocusPlayerCollapse"
          />
          <v-btn size="x-small" variant="text" color="secondary" icon="mdi-close" @click="closeFocusPlayer" />
        </div>
      </div>
      <div class="spotify-dock__body" v-show="!focusPlayer.collapsed">
        <iframe
          :src="currentEmbedUrl"
          width="100%"
          height="232"
          frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    </v-card>

    <v-btn
      v-if="authUser && !focusPlayer.visible"
      class="spotify-dock-reopen"
      color="primary"
      prepend-icon="mdi-spotify"
      @click="openFocusPlayer"
    >
      Reabrir player
    </v-btn>

    <v-snackbar v-model="toast.visible" location="bottom right" color="primary">
      {{ toast.message }}
    </v-snackbar>

    <v-dialog v-model="showLogoutDialog" max-width="360" persistent>
      <div class="logout-glass-card">
        <div class="logout-glass-card__shine" aria-hidden="true"></div>

        <div class="logout-glass-card__icon-wrap">
          <div class="logout-glass-card__icon-ring">
            <v-icon icon="mdi-logout-variant" size="28" color="error" />
          </div>
        </div>

        <h2 class="logout-glass-card__title">Sair da conta</h2>
        <p class="logout-glass-card__body">Tem certeza que deseja encerrar sua sessão?</p>

        <div class="logout-glass-card__actions">
          <button class="logout-btn logout-btn--cancel" @click="showLogoutDialog = false">Cancelar</button>
          <button class="logout-btn logout-btn--confirm" @click="showLogoutDialog = false; logout()">
            <v-icon icon="mdi-logout-variant" size="16" class="mr-1" />
            Sair
          </button>
        </div>
      </div>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { 
  nextTick, ref, computed, watch, onMounted, onBeforeUnmount 
} from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from './stores/useAuthStore';
import { useAppStore } from './stores/useAppStore';
import { useUserStore } from './stores/useUserStore';
import { useTheme } from 'vuetify';

import { use3DScene } from './composables/use3DScene';

// -- GSAP Local Loading --
let _gsap = null;
async function loadGsap() {
  if (!_gsap) _gsap = (await import('gsap')).gsap;
  return _gsap;
}

// -- Stores --
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const appStore = useAppStore();
const userStore = useUserStore();
const vuetifyTheme = useTheme();

const { authUser, authLoading } = storeToRefs(authStore);
const { toast, focusPlayer, focusPlaylists, activePlaylistIndex } = storeToRefs(appStore);
const { settings, profile } = storeToRefs(userStore);

// -- Local UI State --
const showLogoutDialog = ref(false);
const authMode = ref('login');
const authName = ref('');
const authEmail = ref('');
const authPassword = ref('');
const authPasswordConfirm = ref('');

const sectionContent = ref(null);

// -- Components --
// Vue Router handled dynamically through 'router-view' components.

// -- 3D Scene --
const { init3DScene, destroy3DScene } = use3DScene(appStore);

// -- Nav Items --
const navItems = [
  { id: 'dashboard', label: 'Painel', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
  { id: 'subjects', label: 'Matérias', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
  { id: 'timetable', label: 'Horários', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { id: 'agenda', label: 'Agenda', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>' },
  { id: 'records', label: 'Trabalhos', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
  { separator: true },
  { id: 'pomodoro', label: 'Pomodoro', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
  { id: 'communities', label: 'Comunidades', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { id: 'focus-music', label: 'Foco & Música', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>' },
  { separator: true },
  { id: 'assistant', label: 'IA Acadêmica', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  { id: 'profile', label: 'Perfil', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
];

// -- Theme & Config --
const syncTheme = (themeName) => {
  const normalized = themeName === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', normalized);
  vuetifyTheme.change(normalized);
};

const toggleTheme = async () => {
  userStore.settings.theme = userStore.settings.theme === 'dark' ? 'light' : 'dark';
  syncTheme(userStore.settings.theme);
  
  // Persist locally for next load natively
  const syncStore = (await import('./stores/useSyncStore')).useSyncStore();
  syncStore.persistState();
  appStore.showToast(`Tema alterado para ${userStore.settings.theme}.`);
};

const notificationsEnabledLabel = computed(() => 
  userStore.settings.notificationsEnabled ? 'Notificações ativadas' : 'Ativar notificações'
);

const enableNotifications = async () => {
  if (!('Notification' in window)) {
    appStore.showToast('Navegador não suporta.');
    return;
  }
  
  const syncStore = (await import('./stores/useSyncStore')).useSyncStore();
  
  if (Notification.permission === 'granted') {
    userStore.settings.notificationsEnabled = true;
    appStore.showToast('Notificações já permitidas.');
    syncStore.persistState();
    return;
  }
  
  Notification.requestPermission().then((permission) => {
    userStore.settings.notificationsEnabled = permission === 'granted';
    if (permission === 'granted') appStore.showToast('Notificações ativadas.');
    syncStore.persistState();
  });
};

// -- Auth Methods --
const loginWithGoogle = () => authStore.loginWithGoogle();
const loginWithFacebook = () => authStore.loginWithFacebook();
const loginWithEmail = () => {
  authStore.authEmail = authEmail.value;
  authStore.authPassword = authPassword.value;
  authStore.loginWithEmail(authMode.value, authName.value, authPasswordConfirm.value);
};
const logout = () => {
  authStore.logout();
};

// -- App Functionality --
const animateSectionIn = async () => {
  await nextTick();
  if (!sectionContent.value) return;
  const gsap = await loadGsap();
  gsap.fromTo(
    sectionContent.value,
    { autoAlpha: 0, y: 12 },
    { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }
  );
};

const openFocusPlayer = () => {
  appStore.focusPlayer.visible = true;
  appStore.focusPlayer.collapsed = false;
};
const closeFocusPlayer = () => appStore.focusPlayer.visible = false;
const toggleFocusPlayerCollapse = () => appStore.focusPlayer.collapsed = !appStore.focusPlayer.collapsed;

const currentEmbedUrl = computed(() => {
  if (!focusPlaylists.value.length) return '';
  const pl = focusPlaylists.value[activePlaylistIndex.value];
  return pl ? pl.embedUrl : focusPlaylists.value[0].embedUrl;
});

const activeFocusPlaylist = computed(() => {
  if (!focusPlaylists.value.length) return null;
  return focusPlaylists.value[activePlaylistIndex.value] || focusPlaylists.value[0];
});


// -- Lifecycle --
onMounted(() => {
  authStore.initAuth();
  animateSectionIn();
  
  watch(() => userStore.settings.theme, (newVal) => {
    syncTheme(newVal);
  }, { immediate: true });
  
  // Watch for exact moment when auth is complete and user is set, then init 3D
  // If app loads and user is already null, we init.
  let initWatcher = watch(() => authStore.authLoading, (loading) => {
    if (!loading) {
      if (initWatcher) initWatcher();
      init3DScene();
    }
  }, { immediate: true });
});

onBeforeUnmount(() => {
  authStore.cleanup();
  destroy3DScene();
});
</script>

<style scoped>
.three-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.55;
}

/* ── Header ─────────────────────────────── */
.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(var(--gold-500), 0.2);
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.app-header__logo {
  height: 52px;
  width: auto;
  display: block;
}

/* ── Logo wrapper (layout) ────────────── */
.app-logo-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.app-logo-wrap--login {
  margin: 0 auto 1rem;
}

.app-header__titles {
  min-width: 0;
}

.app-header__title {
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--app-text);
  margin: 0;
  white-space: nowrap;
}

.app-header__subtitle {
  font-size: 0.75rem;
  color: var(--app-muted);
  margin: 2px 0 0;
  white-space: nowrap;
}

.app-header__right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

@media (max-width: 600px) {
  .app-header__logo { height: 40px; }
  .app-header__title { font-size: 1rem; }
  .app-header__subtitle { display: none; }
}

/* ── Theme toggle (sun / moon) ────────── */
.theme-toggle {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid rgba(var(--gold-500), 0.35);
  background: rgba(var(--dark-800), 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}

.theme-toggle:hover {
  border-color: rgba(var(--gold-500), 0.6);
  box-shadow: 0 0 12px rgba(var(--gold-500), 0.2);
}

.theme-toggle--light {
  background: rgba(255, 248, 238, 0.7);
}

.theme-toggle__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 400px;
  animation: theme-icon-3d 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes theme-icon-3d {
  0%   { opacity: 0; transform: perspective(400px) rotateY(-160deg) scale(0.3); }
  65%  { transform: perspective(400px) rotateY(12deg) scale(1.08); }
  100% { opacity: 1; transform: perspective(400px) rotateY(0deg) scale(1); }
}

/* Sol */
.theme-icon--sun {
  color: rgb(var(--gold-400, 251 191 36));
  filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.55)) drop-shadow(0 0 2px rgba(251, 191, 36, 0.35));
}

.theme-icon--sun .sun-rays-group {
  transform-box: fill-box;
  transform-origin: center;
  animation: sun-rays-spin 9s linear infinite;
}

@keyframes sun-rays-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Lua */
.theme-icon--moon {
  color: #a5b4fc;
  filter: drop-shadow(0 0 6px rgba(165, 180, 252, 0.6)) drop-shadow(0 0 2px rgba(165, 180, 252, 0.3));
}

/* Perfil do usuário */
.user-profile-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(var(--dark-700), 0.55);
  border: 1px solid rgba(var(--gold-500), 0.22);
  border-radius: 999px;
  padding: 3px 12px 3px 4px;
  cursor: default;
  transition: border-color 0.2s ease;
}

.user-profile-chip:hover {
  border-color: rgba(var(--gold-500), 0.45);
}

.user-profile-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--app-text);
  white-space: nowrap;
}

.nav-item {
  transition: background-color 0.2s ease;
}

.nav-item:hover {
  background-color: rgba(116, 73, 44, 0.08);
}

:global(html[data-theme='dark']) .nav-item:hover {
  background-color: rgba(99, 102, 241, 0.18);
}

.spotify-dock {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: min(370px, calc(100vw - 36px));
  z-index: 20;
  overflow: hidden;
  border: 1px solid rgba(var(--gold-500), 0.25);
  background: rgba(var(--dark-800), 0.92);
  transition: transform 0.25s ease, opacity 0.25s ease, background 0.3s ease, border-color 0.3s ease;
}

.spotify-dock--collapsed {
  width: min(320px, calc(100vw - 36px));
}

.spotify-dock--hidden {
  transform: translateY(120%);
  opacity: 0;
  pointer-events: none;
}

.spotify-dock__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(var(--dark-800), 0.95);
  transition: background 0.3s ease;
}

.spotify-dock__title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.spotify-dock__body {
  border-top: 1px solid rgba(var(--gold-500), 0.15);
  transition: border-color 0.3s ease;
}

.spotify-dock__body iframe {
  display: block;
}

.spotify-dock-reopen {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 20;
}

@media (max-width: 720px) {
  .spotify-dock {
    right: 10px;
    bottom: 10px;
    width: calc(100vw - 20px);
  }

  .spotify-dock-reopen {
    right: 10px;
    bottom: 10px;
  }
}

/* ── Logout — Liquid Glass Modal ────────── */
.logout-glass-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 36px 32px 28px;
  text-align: center;

  background: rgba(var(--dark-800), 0.55);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 1px 0 rgba(255, 255, 255, 0.12) inset;
}

/* luz reflexiva no topo */
.logout-glass-card__shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.02) 40%,
    transparent 70%
  );
  pointer-events: none;
}

.logout-glass-card__icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.logout-glass-card__icon-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-error, 239 68 68), 0.12);
  border: 1.5px solid rgba(var(--v-theme-error, 239 68 68), 0.3);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.18);
}

.logout-glass-card__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--app-text);
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.logout-glass-card__body {
  font-size: 0.875rem;
  color: var(--app-muted);
  margin: 0 0 28px;
  line-height: 1.5;
}

.logout-glass-card__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 22px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  border: none;
  outline: none;
}

.logout-btn:active { transform: scale(0.96); }

.logout-btn--cancel {
  background: rgba(255, 255, 255, 0.07);
  color: var(--app-muted);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn--cancel:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--app-text);
}

.logout-btn--confirm {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
}

.logout-btn--confirm:hover {
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
  transform: translateY(-1px);
}
</style>
