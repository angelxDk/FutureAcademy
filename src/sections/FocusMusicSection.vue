<template>
  <section class="focus-section">
    <FocusSoundMixer />

    <div class="music-player-strip glass-card">
      <div class="music-art"><v-icon icon="mdi-headphones" size="28" /></div>
      <div class="music-player-copy">
        <span class="music-eyebrow">NO SEU PLAYER</span>
        <h2>{{ activeFocusPlaylist?.name || 'Escolha sua trilha de estudo' }}</h2>
        <p>Seu player acompanha você entre as páginas. Inicie a reprodução pelo Spotify.</p>
      </div>
      <div class="music-player-actions">
        <v-btn color="primary" variant="flat" prepend-icon="mdi-play-circle-outline" @click="openFocusPlayer">Mostrar player</v-btn>
        <v-btn variant="text" size="small" @click="openCurrentSpotify">Abrir no Spotify <v-icon end icon="mdi-open-in-new" size="15" /></v-btn>
      </div>
    </div>

    <div class="music-library">
      <header class="music-library-heading">
        <div><span class="music-eyebrow">SUA BIBLIOTECA SONORA</span><h2>Encontre seu ritmo.</h2><p>Escolha uma trilha para acompanhar a próxima sessão.</p></div>
        <v-btn variant="tonal" prepend-icon="mdi-link-variant" :aria-expanded="showImport" @click="showImport = !showImport">Adicionar link</v-btn>
      </header>

      <v-form v-if="showImport" class="music-import glass-card" @submit.prevent="loadCustomPlaylist">
        <v-text-field v-model.trim="appStore.customPlaylistUrl" label="Link do Spotify" placeholder="https://open.spotify.com/playlist/..." variant="outlined" density="comfortable" :error-messages="importError" hide-details="auto" @update:model-value="importError = ''" />
        <v-btn type="submit" color="primary" height="48">Adicionar</v-btn>
      </v-form>

      <div class="playlist-grid">
        <button v-for="(playlist, idx) in appStore.focusPlaylists" :key="`${playlist.mediaType}-${playlist.spotifyUri}`" type="button" class="playlist-card" :class="{ 'playlist-card-active': appStore.activePlaylistIndex === idx }" :aria-pressed="appStore.activePlaylistIndex === idx" @click="selectPlaylist(idx)">
          <span class="playlist-card-top"><span class="playlist-symbol"><v-icon :icon="['mdi-waveform', 'mdi-weather-night', 'mdi-leaf', 'mdi-lightning-bolt-outline', 'mdi-coffee-outline', 'mdi-piano'][idx % 6]" size="25" /></span><span class="playlist-index">{{ String(idx + 1).padStart(2, '0') }}</span></span>
          <strong class="playlist-title">{{ playlist.name }}</strong>
          <span class="playlist-description">{{ playlist.bestFor || playlist.description }}</span>
          <span class="playlist-tags"><span v-for="tag in playlist.tags" :key="tag">{{ tag }}</span></span>
          <span class="playlist-action"><v-icon :icon="appStore.activePlaylistIndex === idx ? 'mdi-check-circle' : 'mdi-play-circle-outline'" size="19" />{{ appStore.activePlaylistIndex === idx ? 'Selecionada no player' : 'Abrir no player' }}<v-icon class="playlist-arrow" icon="mdi-arrow-top-right" size="18" /></span>
        </button>
      </div>
      <p class="music-footnote">A disponibilidade e a reprodução das faixas dependem do Spotify e da sua conta.</p>
    </div>

    <details class="music-scenery glass-card">
      <summary><v-icon icon="mdi-tune-variant" size="18" /> Personalizar cenário</summary>
      <div class="d-flex flex-wrap ga-2 mt-4">
        <v-chip v-for="preset in appStore.focusVisualPresets" :key="preset.value" :color="appStore.focusVisualPreset === preset.value ? 'primary' : undefined" :variant="appStore.focusVisualPreset === preset.value ? 'flat' : 'outlined'" @click="appStore.setFocusVisualPreset(preset.value)"><v-icon start :icon="preset.icon" />{{ preset.label }}</v-chip>
      </div>
      <p class="text-sm text-medium-emphasis mt-3">{{ appStore.focusVisualPresets.find(item => item.value === appStore.focusVisualPreset)?.hint }}</p>
    </details>
  </section>
</template>

<script setup>
import FocusSoundMixer from '../components/FocusSoundMixer.vue';
import { computed, ref } from 'vue';
import { parseSpotifyLink } from '../utils/spotify';
import { useAppStore } from '../stores/useAppStore';
import { createFocusPlaylist } from '../utils/constants';

const appStore = useAppStore();
const showImport = ref(false);
const importError = ref('');

const activeFocusPlaylist = computed(() => {
  return appStore.focusPlaylists[appStore.activePlaylistIndex] || null;
});

const openFocusPlayer = () => {
  appStore.focusPlayer.visible = true;
  appStore.focusPlayer.collapsed = false;
};

const openCurrentSpotify = () => {
  if (!activeFocusPlaylist.value?.openUrl) {
    appStore.showToast('Não há playlist ativa para abrir.');
    return;
  }
  window.open(activeFocusPlaylist.value.openUrl, '_blank', 'noopener');
};

const selectPlaylist = (index) => {
  if (index < 0 || index >= appStore.focusPlaylists.length) return;
  appStore.activePlaylistIndex = index;
  openFocusPlayer();
  appStore.showToast(`Playlist "${appStore.focusPlaylists[index].name}" selecionada.`);
};

const loadCustomPlaylist = () => {
  const url = String(appStore.customPlaylistUrl || '').trim();
  if (!url) {
    appStore.showToast('Cole uma URL do Spotify para carregar.');
    return;
  }

  const parsed = parseSpotifyLink(url);
  if (!parsed) {
    importError.value = 'Use um link válido de playlist, álbum ou faixa em open.spotify.com.';
    return;
  }
  importError.value = '';
  const { mediaType: type, spotifyUri: id } = parsed;
  const existing = appStore.focusPlaylists.findIndex(item => item.spotifyUri === id && (item.mediaType || 'playlist') === type);
  if (existing >= 0) {
    selectPlaylist(existing);
    appStore.customPlaylistUrl = '';
    showImport.value = false;
    return;
  }
  const readableType = type === 'track' ? 'Faixa' : type === 'album' ? 'Álbum' : 'Playlist';
  
  const customEntry = createFocusPlaylist({
    name: `${readableType} personalizada`,
    description: 'Fonte importada manualmente para a sessão de foco.',
    mediaType: type,
    spotifyUri: id,
    frequency: 'Personalizada',
    duration: 'Livre',
    bestFor: 'Sessões customizadas com seu próprio acervo',
    energy: 'Variável',
    tags: ['Personalizada', 'Spotify']
  });

  appStore.focusPlaylists.push(customEntry);
  appStore.activePlaylistIndex = appStore.focusPlaylists.length - 1;
  appStore.customPlaylistUrl = '';
  showImport.value = false;
  openFocusPlayer();
  appStore.showToast(`${readableType} personalizada carregada no player.`);
};
</script>

<style scoped>
.focus-section { display:grid; gap:28px; max-width:1320px; margin:0 auto; container-type:inline-size; }
.music-player-strip { display:flex; align-items:center; gap:20px; padding:24px; }
.music-art,.playlist-symbol { display:grid; place-items:center; background:rgb(var(--gold-500) / .1); color:rgb(var(--gold-400)); border:1px solid rgb(var(--gold-500) / .18); border-radius:15px; flex-shrink:0; }
.music-art { width:64px; height:64px; }
.music-player-copy { flex:1; min-width:0; }
.music-eyebrow { display:block; font-size:10px; font-weight:700; letter-spacing:.16em; color:rgb(var(--gold-400)); margin-bottom:8px; }
.music-player-copy h2 { font-size:18px; line-height:1.4; }
.music-player-copy p,.music-library-heading p { font-size:13px; opacity:.65; margin-top:6px; line-height:1.6; }
.music-player-actions { display:flex; flex-direction:column; gap:4px; align-items:center; }
.music-library-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin:8px 0 24px; }
.music-library-heading h2 { font-size:clamp(24px, 3cqi, 34px); letter-spacing:-.04em; line-height:1.2; }
.music-import { display:flex; align-items:start; gap:12px; padding:20px; margin-bottom:20px; }
.music-import .v-input { min-width:0; }
.playlist-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
.playlist-card { padding:24px; border:1px solid var(--surface-border); border-radius:18px; background:var(--surface); color:var(--app-text); display:flex; flex-direction:column; text-align:left; cursor:pointer; min-width:0; transition:border-color .18s, background .18s; font:inherit; }
.playlist-card:hover { border-color:rgb(var(--gold-500) / .55); }
.playlist-card:focus-visible { outline:3px solid rgb(var(--gold-500) / .65); outline-offset:3px; }
.playlist-card-active { border-color:rgb(var(--gold-500) / .65); background:linear-gradient(135deg,rgb(var(--gold-500) / .08),transparent),var(--surface); }
.playlist-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; }
.playlist-symbol { width:46px; height:46px; border-radius:12px; }
.playlist-index { font-size:12px; opacity:.4; font-variant-numeric:tabular-nums; }
.playlist-title { display:block; font-size:17px; line-height:1.5; overflow-wrap:anywhere; }
.playlist-description { display:block; font-size:13px; line-height:1.75; opacity:.68; margin:8px 0 18px; flex:1; }
.playlist-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:22px; }
.playlist-tags > span { font-size:10px; line-height:1.5; padding:4px 9px; border-radius:6px; background:rgb(var(--gold-500) / .07); opacity:.8; }
.playlist-action { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; padding-top:15px; border-top:1px solid var(--surface-border); }
.playlist-card-active .playlist-action { color:rgb(var(--gold-400)); }
.playlist-arrow { margin-left:auto; }
.music-footnote { font-size:11px; opacity:.55; margin:16px 4px 0; line-height:1.6; }
.music-scenery { padding:18px 22px; }
.music-scenery summary { cursor:pointer; font-size:13px; font-weight:500; }
.music-scenery summary .v-icon { margin-right:8px; }
@container (min-width:1100px) { .playlist-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@container (max-width:650px) { .music-player-strip { flex-wrap:wrap; padding:20px; } .music-player-copy { flex-basis:calc(100% - 90px); } .music-player-actions { flex-direction:row; flex-wrap:wrap; } .music-library-heading { align-items:start; flex-direction:column; } .playlist-grid { grid-template-columns:1fr; } .music-import { flex-direction:column; } .music-import .v-input { width:100%; } }
</style>
