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
          <p class="text-sm mb-1"><span class="font-semibold text-high-emphasis">Tocando agora:</span> {{ ctx.activeFocusPlaylist?.name || 'Nenhuma playlist ativa' }}</p>
          <p class="text-xs text-medium-emphasis mb-0">
            Frequência: {{ ctx.activeFocusPlaylist?.frequency || '---' }} &nbsp;|&nbsp; Duração: {{ ctx.activeFocusPlaylist?.duration || '---' }}
          </p>
        </v-col>
        <v-col cols="12" md="4" class="flex flex-wrap justify-end gap-2 items-start">
          <v-btn color="primary" variant="outlined" size="small" @click="ctx.openFocusPlayer">Abrir player</v-btn>
          <v-btn color="secondary" variant="outlined" size="small" @click="ctx.toggleFocusPlayerCollapse">
            {{ ctx.focusPlayer.collapsed ? 'Expandir' : 'Minimizar' }}
          </v-btn>
          <v-btn color="secondary" variant="text" size="small" @click="ctx.openCurrentSpotify">Abrir no Spotify</v-btn>
        </v-col>
      </v-row>

      <v-divider class="my-5" />

      <div class="flex flex-wrap gap-2">
        <v-chip
          v-for="preset in ctx.focusVisualPresets"
          :key="preset.value"
          :color="ctx.focusVisualPreset === preset.value ? 'primary' : 'secondary'"
          :variant="ctx.focusVisualPreset === preset.value ? 'flat' : 'outlined'"
          @click="ctx.setFocusVisualPreset(preset.value)"
        >
          <v-icon start :icon="preset.icon" />
          {{ preset.label }}
        </v-chip>
      </div>
      <p class="text-xs text-medium-emphasis mt-2 mb-0">
        {{ ctx.focusVisualPresets.find((item) => item.value === ctx.focusVisualPreset)?.hint }}
      </p>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-base font-bold text-primary mb-1">Importar link Spotify</h3>
      <p class="text-sm text-medium-emphasis mb-4">Cole a URL de qualquer playlist do Spotify para tocar no player</p>
      <v-form @submit.prevent="ctx.loadCustomPlaylist">
        <v-row align="center">
          <v-col cols="12" md="9">
            <v-text-field
              v-model.trim="ctx.customPlaylistUrl"
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
          v-for="(playlist, idx) in ctx.focusPlaylists"
          :key="`${playlist.name}-${playlist.spotifyUri}`"
          cols="12"
          md="6"
          xl="4"
        >
          <div
            class="playlist-card glass-card p-4"
            :class="{ 'playlist-card-active': ctx.activePlaylistIndex === idx }"
            style="height: 100%; cursor: pointer"
            @click="ctx.selectPlaylist(idx)"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="min-w-0">
                <p class="text-sm font-bold text-high-emphasis mb-1 truncate">{{ playlist.name }}</p>
                <p class="text-xs text-medium-emphasis mb-0">{{ playlist.description }}</p>
              </div>
              <v-chip size="x-small" color="primary" variant="tonal" class="flex-shrink-0">{{ playlist.frequency }}</v-chip>
            </div>
            <p class="text-xs text-medium-emphasis mb-2"><span class="font-semibold">Ideal para:</span> {{ playlist.bestFor }}</p>
            <div class="flex flex-wrap gap-1 mb-3">
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
              v-if="ctx.activePlaylistIndex === idx"
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
defineProps({
  ctx: {
    type: Object,
    required: true
  }
});
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
