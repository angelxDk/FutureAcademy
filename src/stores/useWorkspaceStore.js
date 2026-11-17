import { defineStore } from 'pinia';
import { WORKSPACE_TOOLS, STUDY_DESK_TOOLS, normalizeWorkspace } from '../utils/workspace';
export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({ ...normalizeWorkspace(), maximized: '', compactSidebar: false, focusMode: false, _beforeDesk: null, _lastDeskSupport: 'assistant' }),
  actions: {
    restore(raw) {
      Object.assign(this, normalizeWorkspace(raw)); this.maximized = ''; this.focusMode = false; this._beforeDesk = null;
      this._lastDeskSupport = this.visible.find(id => id !== 'records') || 'assistant';
    },
    snapshot() { return { layoutVersion: 3, deskMode: this.deskMode, deskSplit: this.deskSplit, compactSidebar: this.compactSidebar, opened: [...this.opened], visible: [...this.visible], active: this.active, ratio: this.ratio }; },
    open(id, beside = false) {
      if (!WORKSPACE_TOOLS.some(t => t.id === id)) return;
      if (this.deskMode) {
        if (id !== 'records') this._lastDeskSupport = id;
        this.visible = this.deskSplit ? ['records', this._lastDeskSupport] : [id];
        this.opened = [...new Set([...this.opened, ...this.visible])];
        this.active = id; this.maximized = '';
        return;
      }
      if (!this.opened.includes(id)) this.opened.push(id);
      if (!this.visible.includes(id)) {
        if (beside && this.visible.length < 2) this.visible.push(id);
        else this.visible.splice(Math.max(0, this.visible.indexOf(this.active)), 1, id);
      }
      this.active = id; this.maximized = '';
    },
    hide(id) {
      if (this.visible.length === 1) return;
      this.visible = this.visible.filter(item => item !== id);
      if (this.deskMode) this.deskSplit = false;
      if (this.active === id) this.active = this.visible[0];
      if (this.maximized === id) this.maximized = '';
    },
    solo(id = this.active) {
      if (!WORKSPACE_TOOLS.some(tool => tool.id === id)) return;
      if (!this.opened.includes(id)) this.opened.push(id);
      this.visible = [id]; this.active = id; this.maximized = '';
      if (this.deskMode) this.deskSplit = false;
    },
    studyPreset() {
      if (!this.deskMode) this._beforeDesk = { visible: [...this.visible], active: this.active, ratio: this.ratio, compactSidebar: this.compactSidebar };
      this.deskMode = true;
      this.deskSplit = false;
      this.compactSidebar = true;
      this.visible = ['records'];
      this.opened = [...new Set([...this.opened, ...STUDY_DESK_TOOLS])];
      this.active = 'records'; this.ratio = 70; this.maximized = ''; this.focusMode = false;
    },
    setSupportTool(id) {
      if (!this.deskMode) return;
      this.open(id);
    },
    setDeskSplit(enabled) {
      if (!this.deskMode) return;
      this.deskSplit = enabled === true;
      if (this.active !== 'records') this._lastDeskSupport = this.active;
      this.visible = this.deskSplit ? ['records', this._lastDeskSupport] : [this.active];
      this.opened = [...new Set([...this.opened, ...this.visible])];
      this.maximized = ''; this.focusMode = false;
    },
    exitStudyDesk() {
      if (!this.deskMode) return;
      const previous = this._beforeDesk;
      const restored = normalizeWorkspace(previous ? { ...previous, opened: [...new Set([...this.opened, ...previous.visible])] } : { opened: [...new Set([...this.opened, 'records'])], visible: ['records'], active: 'records', compactSidebar: false });
      Object.assign(this, restored);
      this._beforeDesk = null;
      this.maximized = ''; this.focusMode = false;
    }
  }
});
