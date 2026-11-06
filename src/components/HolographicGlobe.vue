<template>
  <div ref="globe" class="holographic-globe" :style="placement" aria-hidden="true">
    <div class="globe-aura" />
    <div class="globe-shell"><div class="globe-rotation"><span v-for="ring in 6" :key="ring" class="globe-meridian" :style="{ transform: `rotateY(${ring * 30}deg)` }" /><span v-for="latitude in [-45, 0, 45]" :key="latitude" class="globe-latitude" :style="{ transform: `rotateX(90deg) translateZ(${latitude}px) scale(${latitude ? .86 : 1})` }" /><i v-for="point in points" :key="point.x" :style="{ transform: `translate3d(${point.x}px,${point.y}px,${point.z}px)` }" /></div></div>
    <div class="globe-base-light" />
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
const globe = ref(null), placement = ref({ opacity: 0 });
const points = [{ x: 0, y: -75, z: 35 }, { x: 58, y: -28, z: 53 }, { x: -61, y: 24, z: 51 }, { x: 23, y: 55, z: -58 }, { x: -38, y: -50, z: -55 }, { x: 70, y: 10, z: -41 }];
let observer;
onMounted(() => {
  const host = globe.value.parentElement;
  observer = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    // Match the scene image's cover sizing and 48% 64% object position.
    const scale = Math.max(width / 1122, height / 1402);
    placement.value = { left: `${(width - 1122 * scale) * .48 + 786 * scale}px`, top: `${(height - 1402 * scale) * .64 + 943 * scale}px`, '--globe-scale': scale, opacity: 1 };
  });
  observer.observe(host);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<style scoped>
.holographic-globe { position:absolute; width:176px; height:176px; pointer-events:none; transform:translate(-50%,-50%) scale(var(--globe-scale,1)); transform-origin:center; mix-blend-mode:screen; }
.globe-aura { position:absolute; inset:-30px; border-radius:50%; background:radial-gradient(circle,#85d9ff24,#5cbefc16 45%,transparent 72%); animation:globe-breathe 5s ease-in-out infinite; }
.globe-shell { position:absolute; inset:0; perspective:550px; border-radius:50%; border:1px solid #a7e3ff4a; box-shadow:inset 0 0 24px #7dd9ff18,0 0 18px #76ceff20; }
.globe-rotation { position:absolute; inset:0; transform-style:preserve-3d; animation:globe-turn 24s linear infinite; }
.globe-meridian,.globe-latitude { position:absolute; inset:0; border:1px solid #b2eaff50; border-radius:50%; backface-visibility:visible; }
.globe-rotation i { position:absolute; top:50%; left:50%; width:3px; height:3px; margin:-1.5px; background:#d7f4ff; border-radius:50%; box-shadow:0 0 7px 2px #8bdaff80; }
.globe-base-light { position:absolute; bottom:0; left:8%; width:84%; height:7px; border-radius:50%; background:#b2efff90; box-shadow:0 0 16px 6px #87d8ff44; animation:globe-breathe 5s ease-in-out infinite; }
@keyframes globe-turn { from { transform:rotateY(0deg); } to { transform:rotateY(360deg); } }
@keyframes globe-breathe { 0%,100% { opacity:.45; } 50% { opacity:1; } }
@media(prefers-reduced-motion:reduce) { .globe-rotation,.globe-aura,.globe-base-light { animation:none; } }
</style>
