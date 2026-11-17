<template>
  <aside class="sync-status" :class="`sync-status--${sync.status}`" role="status" aria-live="polite">
    <span class="sync-status__dot" aria-hidden="true" /><span class="sync-status__message">{{ labels[sync.status] || 'Preparando sincronização' }}</span>
    <div v-if="['error', 'offline', 'conflict'].includes(sync.status)" class="sync-status__actions">
      <v-btn size="small" variant="text" @click="sync.exportBackup()">Exportar cópia</v-btn>
      <v-btn v-if="sync.status !== 'conflict'" size="small" variant="text" @click="sync.flushPersist()">Tentar sincronizar</v-btn>
      <v-btn v-else size="small" variant="text" @click="confirmCloud = true">Revisar conflito</v-btn>
    </div>
    <details v-if="sync.error" class="sync-status__details">
      <summary>Detalhes</summary>
      <p>{{ sync.error }}</p>
    </details>
    <v-dialog v-model="confirmCloud" max-width="500">
      <v-card title="Carregar a versão da nuvem?" text="As alterações locais serão substituídas. Exporte sua cópia primeiro para preservar os dois conteúdos.">
        <v-card-actions><v-btn @click="sync.exportBackup()">Exportar cópia local</v-btn><v-btn @click="confirmCloud = false">Cancelar</v-btn><v-btn color="primary" @click="loadCloud">Carregar nuvem</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </aside>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useSyncStore } from '../stores/useSyncStore';
const sync = useSyncStore(), confirmCloud = ref(false);
const labels = { idle: 'Sincronização em espera', loading: 'Buscando seus dados…', pending: 'Alterações salvas neste dispositivo · aguardando nuvem', saving: 'Sincronizando…', synced: 'Dados sincronizados', offline: 'Offline · alterações neste dispositivo', error: 'A sincronização precisa de atenção', conflict: 'Há alterações em outro dispositivo' };
async function loadCloud() { await sync.loadCloudVersion(); confirmCloud.value = false; }
const reconnect = () => sync.flushPersist();
const offline = () => { sync.status = 'offline'; };
const preventLoss = event => { if (sync.pending) { event.preventDefault(); event.returnValue = ''; } };
onMounted(() => { window.addEventListener('online', reconnect); window.addEventListener('offline', offline); window.addEventListener('beforeunload', preventLoss); });
onUnmounted(() => { window.removeEventListener('online', reconnect); window.removeEventListener('offline', offline); window.removeEventListener('beforeunload', preventLoss); });
</script>
<style scoped>
.sync-status { display:flex; align-items:center; flex-wrap:wrap; gap:4px 10px; padding:4px 0; margin-bottom:10px; font-size:13px; line-height:1.5; color:var(--app-muted); }
.sync-status__message { font-size:13px; }
.sync-status__dot { width:6px; height:6px; flex:none; border-radius:50%; background:currentColor; }
.sync-status--synced .sync-status__dot { background:rgb(var(--v-theme-success)); }
.sync-status--error,.sync-status--conflict { padding:4px 10px; border:1px solid rgb(var(--v-theme-warning) / .3); border-radius:8px; background:rgb(var(--v-theme-warning) / .05); }
.sync-status__actions { display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
.sync-status__actions :deep(.v-btn) { min-height:32px; font-size:13px; text-transform:none; letter-spacing:0; }
.sync-status__details { font-size:13px; }
.sync-status__details summary { cursor:pointer; padding:5px 2px; }
.sync-status__details summary:focus-visible { outline:2px solid rgb(var(--gold-500)); outline-offset:2px; border-radius:3px; }
.sync-status__details[open] { flex-basis:100%; }
.sync-status__details p { margin:4px 0 6px; overflow-wrap:anywhere; }
</style>
