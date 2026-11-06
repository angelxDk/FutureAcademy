<template>
  <div class="notebook-editor" v-if="editor">
    <div class="notebook-editor__tools" role="toolbar" aria-label="Formatação do caderno">
      <button v-for="tool in tools" :key="tool.label" type="button" :title="tool.label" :aria-label="tool.label" :aria-pressed="tool.active?.() || false" :class="{ active: tool.active?.() }" @click="tool.run"><v-icon :icon="tool.icon" size="18" /></button>
      <span class="editor-toolbar-divider" />
      <button type="button" title="Desfazer (Ctrl/Cmd Z)" aria-label="Desfazer" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()"><v-icon icon="mdi-undo" size="18" /></button>
      <button type="button" title="Refazer" aria-label="Refazer" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()"><v-icon icon="mdi-redo" size="18" /></button>
      <button type="button" class="editor-spelling-button" title="Revisar ortografia em português" aria-label="Revisar ortografia em português" :disabled="spellingBusy" @click="reviewSpelling"><v-icon icon="mdi-spellcheck" size="18" /><span>{{ spellingBusy ? 'Revisando…' : 'Ortografia' }}</span></button>
    </div>
    <section v-if="reviewOpen" class="spelling-review" aria-label="Revisão ortográfica" aria-live="polite">
      <div class="spelling-heading"><strong>Ortografia · Português brasileiro</strong><button type="button" aria-label="Fechar revisão" @click="reviewOpen = false">Fechar</button></div>
      <p>{{ spellingError || (spellingBusy ? 'Carregando o dicionário e revisando no seu dispositivo…' : issues.length ? 'Confira as sugestões. Nomes próprios e termos técnicos podem estar corretos.' : 'Nenhuma palavra desconhecida encontrada no trecho revisado.') }}</p>
      <div v-for="issue in issues" :key="issue.word" class="spelling-issue"><strong>{{ issue.word }}</strong><div><button v-for="suggestion in issue.suggestions" :key="suggestion" type="button" @click="applySuggestion(issue.word, suggestion)">{{ suggestion }}</button><span v-if="!issue.suggestions.length">Sem sugestões</span><button type="button" class="spelling-ignore" @click="ignoreWord(issue.word)">Ignorar nesta revisão</button></div></div>
      <p v-if="remaining">Há mais {{ remaining }} palavras para conferir. Revise novamente após as correções.</p>
      <small>Revisão ortográfica local, sem envio do texto. Não avalia gramática ou sentido.</small>
    </section>
    <EditorContent :editor="editor" class="notebook-editor__paper" />
    <div class="notebook-editor__footer"><span>{{ editor.getText().split(/\s+/).filter(Boolean).length }} palavras</span><span>Markdown ao digitar · Ctrl/Cmd + B, I, Z</span></div>
  </div>
</template>
<script setup>
import { watch, ref, onBeforeUnmount } from 'vue';
import { collectSpellingWords } from '../utils/spelling';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { normalizeEditorHtml } from '../utils/text';
const props = defineProps({ modelValue: { type: String, default: '<p></p>' } });
const emit = defineEmits(['update:modelValue']);
const editor = useEditor({
  extensions: [StarterKit.configure({ link: { openOnClick: false } }), Placeholder.configure({ placeholder: 'Comece uma ideia. Escreva, destaque ou crie uma lista…' }), TaskList, TaskItem.configure({ nested: true }), Highlight],
  content: normalizeEditorHtml(props.modelValue),
  editorProps: { attributes: { 'aria-label': 'Conteúdo do caderno', role: 'textbox', 'aria-multiline': 'true', spellcheck: 'true', lang: 'pt-BR' }, transformPastedHTML: html => normalizeEditorHtml(html) },
  onUpdate: ({ editor }) => { clearReview(); emit('update:modelValue', editor.getHTML()); }
});
const spellingBusy = ref(false), reviewOpen = ref(false), issues = ref([]), spellingError = ref(''), remaining = ref(0);
let spellingWorker, requestId = 0;
function clearReview() { requestId++; issues.value = []; remaining.value = 0; spellingBusy.value = false; reviewOpen.value = false; }
function reviewSpelling() {
  if (!editor.value) return;
  reviewOpen.value = true; spellingBusy.value = true; spellingError.value = ''; issues.value = [];
  const id = ++requestId;
  if (!spellingWorker) {
    spellingWorker = new Worker(new URL('../workers/spelling.worker.js', import.meta.url), { type: 'module' });
    spellingWorker.onmessage = ({ data }) => {
      if (data.id !== requestId) return;
      spellingBusy.value = false; issues.value = data.issues || []; remaining.value = data.remaining || 0; spellingError.value = data.error || '';
    };
    spellingWorker.onerror = () => { spellingBusy.value = false; spellingError.value = 'O corretor não pôde iniciar. Tente novamente.'; spellingWorker?.terminate(); spellingWorker = null; };
  }
  spellingWorker.postMessage({ id, words: collectSpellingWords(editor.value.state.doc).map(item => item.word) });
}
function ignoreWord(word) { issues.value = issues.value.filter(issue => issue.word !== word); }
function applySuggestion(word, suggestion) {
  const occurrence = collectSpellingWords(editor.value.state.doc).find(item => item.word === word);
  if (!occurrence) { clearReview(); return; }
  editor.value.chain().focus().insertContentAt({ from: occurrence.from, to: occurrence.to }, { type: 'text', text: suggestion }).run();
  reviewSpelling();
}
onBeforeUnmount(() => spellingWorker?.terminate());
const tools = [
  { label: 'Negrito', icon: 'mdi-format-bold', active: () => editor.value?.isActive('bold'), run: () => editor.value.chain().focus().toggleBold().run() },
  { label: 'Itálico', icon: 'mdi-format-italic', active: () => editor.value?.isActive('italic'), run: () => editor.value.chain().focus().toggleItalic().run() },
  { label: 'Sublinhado', icon: 'mdi-format-underline', active: () => editor.value?.isActive('underline'), run: () => editor.value.chain().focus().toggleUnderline().run() },
  { label: 'Marca-texto', icon: 'mdi-marker', active: () => editor.value?.isActive('highlight'), run: () => editor.value.chain().focus().toggleHighlight().run() },
  { label: 'Título', icon: 'mdi-format-header-1', active: () => editor.value?.isActive('heading', { level: 1 }), run: () => editor.value.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Subtítulo', icon: 'mdi-format-header-2', active: () => editor.value?.isActive('heading', { level: 2 }), run: () => editor.value.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Lista', icon: 'mdi-format-list-bulleted', active: () => editor.value?.isActive('bulletList'), run: () => editor.value.chain().focus().toggleBulletList().run() },
  { label: 'Lista numerada', icon: 'mdi-format-list-numbered', active: () => editor.value?.isActive('orderedList'), run: () => editor.value.chain().focus().toggleOrderedList().run() },
  { label: 'Lista de tarefas', icon: 'mdi-checkbox-marked-outline', active: () => editor.value?.isActive('taskList'), run: () => editor.value.chain().focus().toggleTaskList().run() },
  { label: 'Citação', icon: 'mdi-format-quote-close', active: () => editor.value?.isActive('blockquote'), run: () => editor.value.chain().focus().toggleBlockquote().run() },
  { label: 'Bloco de código', icon: 'mdi-code-tags', active: () => editor.value?.isActive('codeBlock'), run: () => editor.value.chain().focus().toggleCodeBlock().run() },
  { label: 'Limpar formatação', icon: 'mdi-format-clear', run: () => editor.value.chain().focus().unsetAllMarks().clearNodes().run() }
];
watch(() => props.modelValue, value => {
  if (editor.value && value !== editor.value.getHTML()) { clearReview(); editor.value.commands.setContent(normalizeEditorHtml(value), { emitUpdate: false }); }
});
</script>
<style scoped>
.notebook-editor { border:1px solid var(--surface-border); border-radius:12px; overflow:clip; background:var(--notebook-paper); }
.notebook-editor__tools { display:flex; flex-wrap:wrap; gap:3px; padding:8px; border-bottom:1px solid var(--surface-border); background:var(--surface); position:sticky; top:0; z-index:3; isolation:isolate; box-shadow:0 3px 8px #0000000a; }
.notebook-editor__tools button { height:32px; width:32px; border-radius:6px; display:grid; place-items:center; color:var(--app-muted); cursor:pointer; }
.notebook-editor__tools button:hover, .notebook-editor__tools button.active { color:rgb(var(--gold-500)); background:rgb(var(--gold-500) / .12); }
.notebook-editor__tools button:disabled { opacity:.3; cursor:default; }
.editor-toolbar-divider { border-left:1px solid var(--surface-border); margin:4px; }
.notebook-editor__paper :deep(.tiptap) { outline:none; min-height:360px; padding:26px 28px 26px 45px; font-size:16px; line-height:30px; background:linear-gradient(90deg,transparent 29px,rgba(185,106,106,.2) 29px,rgba(185,106,106,.2) 30px,transparent 30px),repeating-linear-gradient(transparent 0, transparent 29px,var(--notebook-rule) 29px,var(--notebook-rule) 30px); background-position:0 0,0 26px; overflow-wrap:anywhere; }
.notebook-editor__paper :deep(p) { margin:0 0 30px; }
.notebook-editor__paper :deep(h1) { font-size:28px; margin:30px 0; line-height:30px; }
.notebook-editor__paper :deep(h2) { font-size:21px; margin:30px 0; line-height:30px; }
.notebook-editor__paper :deep(h3) { font-size:17px; margin:30px 0; line-height:30px; }
.notebook-editor__paper :deep(ul), .notebook-editor__paper :deep(ol) { padding-left:23px; }
.notebook-editor__paper :deep(blockquote) { border-left:3px solid rgb(var(--gold-500)); padding:8px 16px; margin:12px 0; background:rgb(var(--gold-500) / .06); }
.notebook-editor__paper :deep(pre) { border-radius:8px; background:rgb(var(--dark-700) / .5); padding:16px; font-size:12px; white-space:pre-wrap; }
.notebook-editor__paper :deep(mark) { background:#f1d58a99; color:inherit; border-radius:2px; padding:1px 2px; }
.notebook-editor__paper :deep(ul[data-type=taskList]) { list-style:none; padding:0; }
.notebook-editor__paper :deep(ul[data-type=taskList] li) { display:flex; gap:10px; }
.notebook-editor__paper :deep(ul[data-type=taskList] label) { padding-top:3px; }
.notebook-editor__paper :deep(ul[data-type=taskList] input) { accent-color:rgb(var(--gold-500)); }
.notebook-editor__paper :deep(ul[data-type=taskList] div) { flex:1; }
.notebook-editor__paper :deep(.is-editor-empty:first-child::before) { content:attr(data-placeholder); float:left; color:var(--app-muted); height:0; pointer-events:none; }
.notebook-editor__footer { display:flex; gap:10px; flex-wrap:wrap; justify-content:space-between; padding:8px 12px; font-size:10px; color:var(--app-muted); border-top:1px solid var(--surface-border); }
.notebook-editor__tools .editor-spelling-button { width:auto; display:flex; gap:6px; padding:0 10px; margin-left:auto; font-size:12px; }
.spelling-review { padding:18px; border-bottom:1px solid var(--surface-border); background:var(--surface); }
.spelling-heading { display:flex; justify-content:space-between; gap:12px; font-size:13px; }
.spelling-heading button { font-size:12px; text-decoration:underline; cursor:pointer; }
.spelling-review p { font-size:12px; line-height:1.7; opacity:.75; margin:10px 0; }
.spelling-review small { display:block; font-size:10px; opacity:.6; margin-top:14px; }
.spelling-issue { padding:12px 0; border-bottom:1px solid var(--surface-border); font-size:13px; }
.spelling-issue > div { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
.spelling-issue button { padding:5px 10px; border:1px solid var(--surface-border); border-radius:6px; cursor:pointer; font-size:12px; background:rgb(var(--gold-500) / .08); }
.spelling-issue button:hover { border-color:rgb(var(--gold-500)); }
.spelling-issue .spelling-ignore { background:transparent; opacity:.65; }
.spelling-issue span { font-size:12px; opacity:.6; }
/* Keep every block on the paper's 30px baseline, including pasted lists. */
.notebook-editor__paper :deep(.tiptap > :first-child) { margin-top:0; }
.notebook-editor__paper :deep(.tiptap > :last-child) { margin-bottom:0; }
.notebook-editor__paper :deep(ul),.notebook-editor__paper :deep(ol) { margin:0 0 30px; }
.notebook-editor__paper :deep(li p),.notebook-editor__paper :deep(li ul),.notebook-editor__paper :deep(li ol) { margin:0; }
.notebook-editor__paper :deep(blockquote) { margin:0 0 30px; padding:0 16px; }
.notebook-editor__paper :deep(blockquote p:last-child) { margin-bottom:0; }
.notebook-editor__paper :deep(pre) { line-height:30px; margin:0 0 30px; padding:15px; }
.notebook-editor__paper :deep(hr) { height:30px; border:0; margin:0; }
</style>
