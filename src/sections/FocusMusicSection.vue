<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <div class="flex items-center gap-3 mb-1">
        <v-icon icon="mdi-headphones" color="primary" size="22" />
        <h2 class="text-xl font-bold text-primary">Foco & Música</h2>
      </div>
      <p class="text-sm text-medium-emphasis mb-5">
        O player Spotify fica persistente no canto da aplicação e continua tocando ao trocar de página.
      </p>

      <v-row>
        <v-col cols="12" md="8">
          <p class="text-sm mb-1"><span class="font-semibold text-high-emphasis">Tocando agora:</span> {{ activeFocusPlaylist?.name || 'Nenhuma playlist ativa' }}</p>
          <p class="text-xs text-medium-emphasis mb-0">
            Frequência: {{ activeFocusPlaylist?.frequency || '---' }} &nbsp;|&nbsp; Duração: {{ activeFocusPlaylist?.duration || '---' }}
          </p>
        </v-col>
        <v-col cols="12" md="4" class="d-flex flex-wrap justify-end ga-2 align-start">
          <v-btn color="primary" variant="outlined" size="small" @click="openFocusPlayer">Abrir player</v-btn>
          <v-btn color="secondary" variant="outlined" size="small" @click="toggleFocusPlayerCollapse">
            {{ appStore.focusPlayer.collapsed ? 'Expandir' : 'Minimizar' }}
          </v-btn>
          <v-btn color="secondary" variant="text" size="small" @click="openCurrentSpotify">Abrir no Spotify</v-btn>
        </v-col>
      </v-row>

      <v-divider class="my-5" />

      <div class="d-flex flex-wrap ga-2">
        <v-chip
          v-for="preset in appStore.focusVisualPresets"
          :key="preset.value"
          :color="appStore.focusVisualPreset === preset.value ? 'primary' : 'secondary'"
          :variant="appStore.focusVisualPreset === preset.value ? 'flat' : 'outlined'"
          @click="appStore.setFocusVisualPreset(preset.value)"
        >
          <v-icon start :icon="preset.icon" />
          {{ preset.label }}
        </v-chip>
      </div>
      <p class="text-xs text-medium-emphasis mt-2 mb-0">
        {{ appStore.focusVisualPresets.find((item) => item.value === appStore.focusVisualPreset)?.hint }}
      </p>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-base font-bold text-primary mb-1">Importar link Spotify</h3>
      <p class="text-sm text-medium-emphasis mb-4">Cole a URL de qualquer playlist do Spotify para tocar no player</p>
      <v-form @submit.prevent="loadCustomPlaylist">
        <v-row align="center">
          <v-col cols="12" md="9">
            <v-text-field
              v-model.trim="appStore.customPlaylistUrl"
              label="URL personalizada do Spotify"
              placeholder="https://open.spotify.com/playlist/..."
              variant="outlined"
              density="comfortable"
              bg-color="transparent"
              color="primary"
              hide-details
              prepend-inner-icon="mdi-link-variant"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn type="submit" color="primary" variant="flat" block height="44" class="font-semibold">Importar</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <div class="glass-card p-6">
      <div class="flex items-center gap-3 mb-1">
        <v-icon icon="mdi-music-circle" color="secondary" size="22" />
        <h3 class="text-lg font-bold text-high-emphasis">Playlists Binaurais Curadas</h3>
      </div>
      <p class="text-sm text-medium-emphasis mb-5">Selecione uma playlist para tocar no player persistente.</p>

      <v-row>
        <v-col
          v-for="(playlist, idx) in appStore.focusPlaylists"
          :key="`${playlist.name}-${playlist.spotifyUri}`"
          cols="12"
          md="6"
          xl="4"
        >
          <div
            class="playlist-card glass-card p-4"
            :class="{ 'playlist-card-active': appStore.activePlaylistIndex === idx }"
            style="height: 100%; cursor: pointer"
            @click="selectPlaylist(idx)"
          >
            <div class="d-flex align-start justify-space-between ga-2 mb-2">
              <div class="min-w-0">
                <p class="text-sm font-bold mb-1" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ playlist.name }}</p>
                <p class="text-xs text-medium-emphasis mb-0">{{ playlist.description }}</p>
              </div>
              <v-chip size="x-small" color="primary" variant="tonal" style="flex-shrink: 0">{{ playlist.frequency }}</v-chip>
            </div>
            <p class="text-xs text-medium-emphasis mb-2"><span class="font-semibold">Ideal para:</span> {{ playlist.bestFor }}</p>
            <div class="d-flex flex-wrap ga-1 mb-3">
              <v-chip
                v-for="tag in playlist.tags"
                :key="`${playlist.name}-${tag}`"
                size="x-small"
                variant="outlined"
              >
                {{ tag }}
              </v-chip>
            </div>
            <v-chip
              v-if="appStore.activePlaylistIndex === idx"
              color="primary"
              size="small"
              prepend-icon="mdi-play"
              variant="flat"
            >
              Tocando agora
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../stores/useAppStore';
import { createFocusPlaylist } from '../utils/constants';

const appStore = useAppStore();

const activeFocusPlaylist = computed(() => {
  return appStore.focusPlaylists[appStore.activePlaylistIndex] || null;
});

const openFocusPlayer = () => {
  appStore.focusPlayer.visible = true;
  appStore.focusPlayer.collapsed = false;
};

const toggleFocusPlayerCollapse = () => {
  appStore.focusPlayer.collapsed = !appStore.focusPlayer.collapsed;
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

  const match = url.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (!match) {
    appStore.showToast('URL inválida. Use um link do Spotify (playlist, álbum ou faixa).');
    return;
  }

  const [, type, id] = match;
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
  openFocusPlayer();
  appStore.showToast(`${readableType} personalizada carregada no player.`);
};
</script>

<style scoped>
.playlist-card {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.playlist-card-active {
  border-color: rgba(var(--gold-500), 0.5) !important;
  background: linear-gradient(160deg, rgba(var(--gold-500), 0.1), rgba(var(--dark-800), 0.7)) !important;
}
</style>
