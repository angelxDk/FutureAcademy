<template>
  <v-app :theme="userStore.settings.theme" :class="['app-root', `theme-${userStore.settings.theme}`]" style="background: transparent !important;">
    <canvas id="bg-canvas-3d" class="three-bg" aria-hidden="true"></canvas>

    <v-main style="position: relative; z-index: 10;">
      <v-container fluid class="py-6" :class="{ 'auth-container': (!authUser || route.name === 'login') && !authLoading }">
        <div v-if="authLoading" class="d-flex flex-column align-center justify-center" style="min-height: 70vh; gap: 16px">
          <v-progress-circular indeterminate size="48" color="primary" />
          <p class="text-medium-emphasis">Carregando Future Academy...</p>
        </div>

        <AuthPortal v-else-if="!authUser || route.name === 'login'" :signed-in="!!authUser" :busy="authStore.authBusy" @google="loginWithGoogle" @facebook="loginWithFacebook" @submit="loginWithEmail" />

        <template v-else>
          <header class="app-header mb-6">
            <div class="app-header__left">
              <div class="app-logo-wrap">
                <img src="/academy-emblem-transparent.png" alt="Future Academy" class="app-header__logo" />
              </div>
              <div class="app-header__titles">
                <h1 class="app-header__title">Future Academy</h1>
                <p class="app-header__subtitle">Seu espaço de aprendizado</p>
              </div>
            </div>

            <AcademySidebar header />

            <div class="app-header__right">

              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <button v-bind="props" type="button" class="user-profile-chip" aria-label="Abrir menu da conta">
                    <v-avatar size="32" class="user-avatar-img"><v-img :src="profile.photo || authUser.photo" :alt="authUser.name" cover /></v-avatar>
                    <span class="user-profile-name">{{ (profile.name || authUser.name).split(' ')[0] }}</span>
                    <v-icon icon="mdi-chevron-down" size="16" />
                  </button>
                </template>
                <v-list density="comfortable" rounded="lg" min-width="190" aria-label="Menu da conta">
                  <v-list-item :to="{ name: 'profile' }" prepend-icon="mdi-account-edit-outline" title="Editar perfil" />
                </v-list>
              </v-menu>

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

          <div class="academy-shell">
            <div class="academy-main" ref="sectionContent">
              <div v-if="authStore.dataLoading" class="glass-card p-8 text-center"><v-progress-circular indeterminate color="primary" /><p class="mt-3">Abrindo seu fichário...</p></div>
              <StudyWorkspace v-else />
            </div>
          </div>
        </template>
      </v-container>
    </v-main>

    <v-card
      v-if="authUser && route.name !== 'login'"
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
          height="152"
          title="Player do Spotify"
          frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    </v-card>

    <v-btn
      v-if="authUser && route.name !== 'login' && !focusPlayer.visible"
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

import { useSyncStore } from './stores/useSyncStore';
import { useWorkspaceStore } from './stores/useWorkspaceStore';
import AcademySidebar from './components/AcademySidebar.vue';
import AuthPortal from './components/AuthPortal.vue';
import StudyWorkspace from './components/StudyWorkspace.vue';
import { use3DScene } from './composables/use3DScene';

// -- GSAP Local Loading --
let _gsap = null;
async function loadGsap() {
  if (!_gsap) _gsap = (await import('gsap')).gsap;
  return _gsap;
}

// -- Stores --
const syncStore = useSyncStore();
const workspace = useWorkspaceStore();
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

const sectionContent = ref(null);

// -- Components --
// Vue Router handled dynamically through 'router-view' components.

// -- 3D Scene --
const { init3DScene, destroy3DScene, pauseCanvas, resumeCanvas, update3DTheme } = use3DScene(appStore);

// -- Theme & Config --
const syncTheme = (themeName) => {
  const normalized = themeName === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', normalized);
  vuetifyTheme.change(normalized);
  update3DTheme();
};

const toggleTheme = async () => {
  userStore.settings.theme = userStore.settings.theme === 'dark' ? 'light' : 'dark';
  syncTheme(userStore.settings.theme);
  
  // Persist locally for next load natively
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
const loginWithGoogle = async () => { await authStore.loginWithGoogle(); if (authStore.authUser) router.replace('/'); };
const loginWithFacebook = async () => { await authStore.loginWithFacebook(); if (authStore.authUser) router.replace('/'); };
const loginWithEmail = async ({ mode, name, email, password, confirm }) => {
  authStore.authEmail = email;
  authStore.authPassword = password;
  await authStore.loginWithEmail(mode, name, confirm);
  if (authStore.authUser) router.replace('/');
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
let _canvasFocusIn = null;
let _canvasFocusOut = null;

onMounted(() => {
  authStore.initAuth();
  animateSectionIn();
  
  watch(() => userStore.settings.theme, (newVal) => {
    syncTheme(newVal);
  }, { immediate: true });
  
  // The entrance uses its own artwork; reserve animated 3D for the signed-in workspace.
  watch(() => !!authStore.authUser && route.name === 'focus-music', active => {
    if (active) init3DScene();
    else destroy3DScene();
  }, { immediate: true });

  // Pausar canvas 3D enquanto o usuário digita (libera GPU/compositor)
  _canvasFocusIn = (e) => { if (e.target.matches('input, textarea, [contenteditable]')) pauseCanvas(); };
  _canvasFocusOut = () => resumeCanvas();
  document.addEventListener('focusin', _canvasFocusIn);
  document.addEventListener('focusout', _canvasFocusOut);
});

onBeforeUnmount(() => {
  authStore.cleanup();
  destroy3DScene();
  if (_canvasFocusIn) document.removeEventListener('focusin', _canvasFocusIn);
  if (_canvasFocusOut) document.removeEventListener('focusout', _canvasFocusOut);
});
</script>

<style scoped>
.three-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.12;
}

:global(html[data-theme='light'] .three-bg) { opacity:0.48; }

/* ── Header ─────────────────────────────── */
.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 4px 18px;
  border-bottom: 1px solid rgb(var(--gold-500) / 0.2);
}

.app-header > .academy-navigation--header { flex: 0 1 auto; margin-inline: auto; }

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
  border: 1.5px solid rgb(var(--gold-500) / 0.35);
  background: rgb(var(--dark-800) / 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}

.theme-toggle:hover {
  border-color: rgb(var(--gold-500) / 0.6);
  box-shadow: 0 0 12px rgb(var(--gold-500) / 0.2);
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
  color: #eed59a;
  filter: drop-shadow(0 0 6px rgba(238, 213, 154, 0.45)) drop-shadow(0 0 2px rgba(238, 213, 154, 0.25));
}

/* Perfil do usuário */
.user-profile-chip:focus-visible { outline:2px solid rgb(var(--gold-500)); outline-offset:4px; }
.user-profile-chip {
  cursor:pointer;
  font:inherit;
  color:var(--app-text);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgb(var(--dark-700) / 0.55);
  border: 1px solid rgb(var(--gold-500) / 0.22);
  border-radius: 999px;
  padding: 3px 12px 3px 4px;
  cursor: default;
  transition: border-color 0.2s ease;
}

.user-profile-chip:hover {
  border-color: rgb(var(--gold-500) / 0.45);
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

:global(html[data-theme='dark'] .nav-item:hover) {
  background-color: rgba(99, 102, 241, 0.18);
}

.spotify-dock {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: min(370px, calc(100vw - 36px));
  z-index: 20;
  overflow: hidden;
  border: 1px solid rgb(var(--gold-500) / 0.25);
  background: var(--surface);
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
  background: var(--surface);
  transition: background 0.3s ease;
}

.spotify-dock__title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.spotify-dock__body {
  border-top: 1px solid rgb(var(--gold-500) / 0.15);
  transition: border-color 0.3s ease;
}

.spotify-dock__body iframe {
  display: block;
  border-radius:12px;
}
.spotify-dock__body { padding:8px; background:var(--surface); }
:global(html[data-theme='light'] .spotify-dock__body iframe) {
  filter:invert(1) hue-rotate(180deg) sepia(.28) saturate(.7);
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

  background: rgb(var(--dark-800) / 0.55);
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
