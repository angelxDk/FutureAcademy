import { defineStore } from 'pinia';
import { setFocusSound, stopFocusSounds, disposeFocusAudio } from '../services/focusAudio';
export const useSoundStore = defineStore('focus-sounds', {
  state: () => ({ levels: { rain: 0, brown: 0, soft: 0 }, error: '' }),
  getters: { playing: state => Object.values(state.levels).some(value => value > 0) },
  actions: {
    async setLevel(id, level) {
      if (!Object.hasOwn(this.levels, id)) return;
      this.error = '';
      try { await setFocusSound(id, level / 100); this.levels[id] = level; }
      catch (error) { this.error = error.message; }
    },
    stop() { stopFocusSounds(); this.levels = { rain: 0, brown: 0, soft: 0 }; },
    dispose() { disposeFocusAudio(); this.$reset(); }
  }
});
