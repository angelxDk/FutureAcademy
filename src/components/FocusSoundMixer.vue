<template>
  <div class="glass-card p-6 sound-mixer">
    <div class="section-heading"><div><p class="eyebrow">SEU AMBIENTE DE CONCENTRAÇÃO</p><h2 class="text-xl font-bold">Menos distração. Mais presença.</h2></div><v-chip size="small" variant="tonal" color="success">Gratuito · sem anúncios</v-chip></div>
    <p class="text-sm text-medium-emphasis mb-5">Misture texturas sonoras suaves. Geradas no seu dispositivo, sem downloads ou conta de streaming.</p>
    <div class="sound-grid"><div v-for="sound in sounds" :key="sound.id" class="sound-channel" :class="{ 'sound-channel--active': audio.levels[sound.id] > 0 }"><v-icon :icon="sound.icon" size="28" /><strong>{{ sound.label }}</strong><small>{{ sound.description }}</small><div class="sound-channel__control"><input type="range" min="0" max="100" :value="audio.levels[sound.id]" :aria-label="`Volume de ${sound.label}`" @input="audio.setLevel(sound.id, Number($event.target.value))" /><span>{{ audio.levels[sound.id] }}%</span></div></div></div>
    <div class="flex justify-between items-center flex-wrap gap-3 mt-5"><span class="text-xs text-medium-emphasis">Comece com volume baixo e ajuste ao seu conforto.</span><v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-volume-off" :disabled="!audio.playing" @click="audio.stop()">Silenciar tudo</v-btn></div>
    <v-alert v-if="audio.error" class="mt-3" type="error" variant="tonal" density="compact">{{ audio.error }}</v-alert>
  </div>
</template>
<script setup>
import { useSoundStore } from '../stores/useSoundStore';
const audio = useSoundStore();
const sounds = [{ id: 'rain', label: 'Chuva suave', description: 'Textura de ruído filtrado', icon: 'mdi-weather-rainy' }, { id: 'brown', label: 'Ruído marrom', description: 'Graves para um fundo estável', icon: 'mdi-waveform' }, { id: 'soft', label: 'Brisa', description: 'Som abafado e delicado', icon: 'mdi-weather-windy' }];
</script>
<style scoped>
.sound-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.sound-channel { display:flex; flex-direction:column; align-items:flex-start; gap:12px; border:1px solid var(--surface-border); border-radius:12px; padding:20px 16px; }
.sound-channel--active { background:rgb(var(--gold-500) / .07); border-color:rgb(var(--gold-500) / .5); }
.sound-channel strong { font-size:13px; }
.sound-channel small { font-size:11px; line-height:1.5; color:var(--app-muted); }
.sound-channel__control { width:100%; display:flex; align-items:center; gap:8px; margin-top:auto; padding-top:10px; }
.sound-channel input { width:100%; min-width:0; accent-color:rgb(var(--gold-500)); cursor:pointer; }
.sound-channel__control span { font-size:10px; min-width:28px; }
@container(max-width:650px) { .sound-grid { grid-template-columns:1fr; } .sound-channel { gap:8px; } }
</style>
