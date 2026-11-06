import { defineStore } from 'pinia';
import { WORKSPACE_TOOLS, normalizeWorkspace } from '../utils/workspace';
export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({ ...normalizeWorkspace(), maximized: '', compactSidebar: false }),
  actions: {
    restore(raw) { Object.assign(this, normalizeWorkspace(raw)); this.maximized = ''; },
    snapshot() { return { compactSidebar: this.compactSidebar, opened: [...this.opened], visible: [...this.visible], active: this.active, ratio: this.ratio }; },
    open(id, beside = false) {
      if (!WORKSPACE_TOOLS.some(t => t.id === id)) return;
      if (!this.opened.includes(id)) this.opened.push(id);
      if (!this.visible.includes(id)) {
        if (beside && this.visible.length < 4) this.visible.push(id);
        else this.visible.splice(Math.max(0, this.visible.indexOf(this.active)), 1, id);
      }
      this.active = id; this.maximized = '';
    },
    hide(id) {
      if (this.visible.length === 1) return;
      this.visible = this.visible.filter(item => item !== id);
      if (this.active === id) this.active = this.visible[0];
      if (this.maximized === id) this.maximized = '';
    },
    solo(id = this.active) { this.visible = [id]; this.active = id; this.maximized = ''; },
    studyPreset() {
      this.visible = ['records', 'assistant', 'focus-music', 'communities'];
      this.opened = [...new Set([...this.opened, ...this.visible])];
      this.active = 'records'; this.maximized = '';
    }
  }
});
