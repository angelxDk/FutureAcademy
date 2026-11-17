<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { useSyncStore } from '../stores/useSyncStore';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const sync = useSyncStore();
const installPrompt = ref<InstallPromptEvent | null>(null);
const offline = ref(false);
const dismissed = ref(false);
const busy = ref(false);
const error = ref('');
let registration: ServiceWorkerRegistration | undefined;
let lastUpdateCheck = 0;

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, currentRegistration) { registration = currentRegistration; }
});

const visible = computed(() => !dismissed.value && (needRefresh.value || installPrompt.value || offline.value));
watch(needRefresh, value => { if (value) dismissed.value = false; });

function receiveInstallPrompt(event: Event) {
  event.preventDefault();
  installPrompt.value = event as InstallPromptEvent;
  dismissed.value = false;
}

function installed() { installPrompt.value = null; }

function dismissNotice() {
  dismissed.value = true;
  needRefresh.value = false;
}

function connectionChanged() {
  offline.value = !navigator.onLine;
  dismissed.value = false;
  if (!offline.value) checkForUpdate();
}

function checkForUpdate() {
  if (!registration || !navigator.onLine || document.visibilityState === 'hidden') return;
  if (Date.now() - lastUpdateCheck < 60 * 60 * 1000) return;
  lastUpdateCheck = Date.now();
  // An unavailable update server must never interrupt the current study session.
  void registration.update().catch(() => {});
}

async function install() {
  const prompt = installPrompt.value;
  if (!prompt) return;
  busy.value = true;
  error.value = '';
  try {
    await prompt.prompt();
    await prompt.userChoice;
    installPrompt.value = null;
  } catch {
    error.value = 'Não foi possível abrir a instalação. Tente pelo menu do navegador.';
  } finally { busy.value = false; }
}

async function update() {
  busy.value = true;
  error.value = '';
  try {
    await sync.flushPersist();
    if (sync.pending) {
      error.value = 'Sincronize suas alterações ou exporte uma cópia antes de atualizar.';
      return;
    }
    await updateServiceWorker(true);
  } catch {
    error.value = 'Não foi possível atualizar agora. Sua sessão continua aberta.';
  } finally { busy.value = false; }
}

onMounted(() => {
  offline.value = !navigator.onLine;
  window.addEventListener('beforeinstallprompt', receiveInstallPrompt);
  window.addEventListener('appinstalled', installed);
  window.addEventListener('online', connectionChanged);
  window.addEventListener('offline', connectionChanged);
  document.addEventListener('visibilitychange', checkForUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', receiveInstallPrompt);
  window.removeEventListener('appinstalled', installed);
  window.removeEventListener('online', connectionChanged);
  window.removeEventListener('offline', connectionChanged);
  document.removeEventListener('visibilitychange', checkForUpdate);
});
</script>

<template>
  <aside v-if="visible" class="pwa-status" aria-label="Aplicativo Future Academy" aria-live="polite">
    <div class="pwa-status__message">
      <template v-if="offline">
        <strong>Você está sem conexão</strong>
        <p>A sincronização e os serviços online voltam quando a conexão retornar.</p>
      </template>
      <template v-else-if="needRefresh">
        <strong>Uma nova versão está pronta</strong>
        <p>Salve também o que estiver aberto em outras abas antes de atualizar.</p>
      </template>
      <template v-else>
        <strong>Sua academia, sempre à mão</strong>
        <p>Instale a Future Academy para abrir direto pela tela inicial.</p>
      </template>
      <p v-if="error" class="pwa-status__error" role="alert">{{ error }}</p>
    </div>
    <div class="pwa-status__actions">
      <button v-if="!offline && needRefresh" type="button" :disabled="busy" @click="update">{{ busy ? 'Preparando…' : 'Atualizar' }}</button>
      <button v-else-if="!offline && installPrompt" type="button" :disabled="busy" @click="install">{{ busy ? 'Abrindo…' : 'Instalar' }}</button>
      <button type="button" class="pwa-status__dismiss" :disabled="busy" @click="dismissNotice">Depois</button>
    </div>
  </aside>
</template>

<style scoped>
.pwa-status {
  position: fixed;
  z-index: 1200;
  left: max(1rem, env(safe-area-inset-left));
  bottom: max(1rem, env(safe-area-inset-bottom));
  width: min(360px, calc(100vw - 2rem));
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-primary), .4);
  border-radius: 14px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 30px #0003;
  font-size: .85rem;
}
.pwa-status strong { font-size: .9rem; }
.pwa-status p { margin: .3rem 0 0; line-height: 1.5; }
.pwa-status__actions { display: flex; gap: .5rem; margin-top: .75rem; }
.pwa-status button { padding: .4rem .8rem; border-radius: 6px; color: rgb(var(--v-theme-on-primary)); background: rgb(var(--v-theme-primary)); font-weight: 700; }
.pwa-status button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.pwa-status button:disabled { opacity: .6; cursor: wait; }
.pwa-status button.pwa-status__dismiss { color: inherit; background: transparent; }
.pwa-status__error { color: rgb(var(--v-theme-error)); }
</style>
