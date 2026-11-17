<template>
  <section class="grid gap-4 assistant-section" :class="{ 'assistant-section--desk': workspace.deskMode }">
    <div class="assistant-intro"><div><p class="eyebrow">FICHÁRIO / TUTOR DE ESTUDO</p><h2 class="text-2xl font-bold">Aprender é perguntar<span class="text-primary">.</span></h2><p class="text-sm text-medium-emphasis mt-2">Converse sobre uma aula, pratique e transforme a resposta em anotação.</p></div><v-chip size="small" color="success" variant="tonal">{{ ai.provider === 'cloud' ? 'Nuvem · Pro' : 'IA local gratuita' }}</v-chip></div>
    <details ref="configuration" class="glass-card p-5 assistant-configuration" :open="!workspace.deskMode && !ai.ready && !ai.messages.length"><summary class="font-semibold" style="cursor:pointer">{{ ai.provider === 'browser' ? 'IA no navegador' : ai.provider === 'cloud' ? 'Tutor na nuvem · Pro' : 'Ollama local' }} <span class="assistant-configuration__status">{{ ai.loading ? '· Carregando modelo…' : requiresSetup ? '· Configurar modelo' : '· Opções' }}</span></summary>
      <div class="grid gap-3 mt-4"><v-select v-model="ai.provider" :items="[{ title: 'No navegador · WebGPU', value: 'browser' }, { title: 'No servidor local · Ollama', value: 'ollama' }, { title: 'Na nuvem · Pro', value: 'cloud' }]" label="Onde executar" variant="outlined" hide-details :disabled="ai.busy || ai.loading" />
        <template v-if="ai.provider === 'browser'"><v-select v-model="ai.browserModel" :items="browserModels" label="Modelo gratuito" variant="outlined" hide-details :disabled="ai.busy || ai.loading" @update:model-value="ai.ready = false" /><p class="text-xs text-medium-emphasis">O primeiro uso baixa centenas de MB de arquivos do modelo. Precisa de WebGPU e memória disponível. Depois do download, as perguntas são processadas no dispositivo. Modelos pequenos têm qualidade limitada; confira as respostas.</p><div class="flex flex-wrap gap-2"><v-btn color="primary" variant="tonal" :loading="ai.loading" :disabled="ai.busy || ai.ready" @click="ai.initialize()">{{ ai.ready ? 'Modelo carregado' : 'Baixar e iniciar IA gratuita' }}</v-btn><v-btn v-if="ai.loading" variant="text" @click="cancelLoading">Cancelar</v-btn><v-btn v-if="ai.ready" variant="text" @click="releaseModel">Liberar memória</v-btn></div><p v-if="ai.progress" class="text-xs text-medium-emphasis" role="status">{{ ai.progress }}</p></template>
        <template v-else-if="ai.provider === 'ollama'"><v-select v-model="ai.ollamaModel" :items="ollamaModels" label="Modelo instalado no Ollama" variant="outlined" hide-details :disabled="ai.busy" :no-data-text="'Clique em buscar modelos'" /><v-btn variant="tonal" color="primary" :loading="checkingOllama" @click="checkOllama">Buscar modelos locais</v-btn><p class="text-xs text-medium-emphasis">Instale o Ollama no computador que executa o backend, baixe um modelo e mantenha o serviço aberto. Não requer chave de API. <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">Instalar Ollama</a></p><p v-if="ollamaError" class="text-sm text-error" role="alert">{{ ollamaError }}</p></template>
        <p v-if="ai.provider === 'cloud'" class="text-sm">O tutor Pro envia sua pergunta e o material selecionado ao provedor de IA. Limite de 20 solicitações por dia (UTC). Confira seu plano no <router-link to="/profile">perfil</router-link>. Respostas podem conter erros.</p>
      </div>
    </details>
    <div class="glass-card p-5 grid gap-3 assistant-context"><v-select v-model="ai.contextId" :items="contextOptions" item-title="title" item-value="id" label="Material para estudar (opcional)" variant="outlined" hide-details clearable :disabled="ai.busy" /><p class="text-xs text-medium-emphasis">Só o material escolhido entra como contexto da próxima pergunta.</p></div>
    <div v-if="!ai.messages.length" class="assistant-welcome"><v-icon icon="mdi-auto-fix" size="32" color="primary" /><h3>O que vamos entender hoje?</h3><div class="assistant-prompts"><button v-for="prompt in prompts" :key="prompt.label" @click="ai.question = prompt.text"><v-icon :icon="prompt.icon" size="18" /><strong>{{ prompt.label }}</strong><small>{{ prompt.hint }}</small></button></div></div>
    <div v-else class="assistant-messages" aria-live="polite" aria-label="Conversa com o tutor"><div v-for="message in ai.messages" :key="message.id" class="assistant-message" :class="`assistant-message--${message.role}`"><p class="eyebrow">{{ message.role === 'user' ? 'VOCÊ' : 'TUTOR DE ESTUDO' }}</p><div v-if="message.role === 'assistant'" class="study-markdown" v-html="renderMarkdown(message.content || (ai.busy ? 'Pensando…' : 'Resposta interrompida.'))" /><p v-else class="whitespace-pre-wrap">{{ message.content }}</p><div v-if="message.role === 'assistant' && message.content && !ai.busy" class="flex gap-2 mt-3"><v-btn size="x-small" variant="text" prepend-icon="mdi-content-copy" @click="copy(message.content)">Copiar</v-btn><v-btn size="x-small" variant="text" prepend-icon="mdi-notebook-plus-outline" @click="saveNote(message)">Salvar no caderno</v-btn></div></div></div>
    <v-alert v-if="ai.error" class="assistant-error" type="error" variant="tonal" density="compact" closable @click:close="ai.error = ''">{{ ai.error }}</v-alert>
    <v-form @submit.prevent="submit" class="assistant-composer">
      <label class="assistant-composer-label" for="study-question"><v-icon icon="mdi-message-text-outline" size="17" />Sua próxima pergunta</label>
      <v-textarea id="study-question" v-model="ai.question" aria-label="Sua pergunta para a IA" placeholder="O que você quer entender? Pergunte ou cole um trecho para estudar…" variant="plain" rows="3" max-rows="9" auto-grow hide-details :disabled="ai.busy" maxlength="3000" @keydown.ctrl.enter.prevent="submit" @keydown.meta.enter.prevent="submit" />
      <p v-if="workspace.deskMode && requiresSetup" class="assistant-setup-hint">{{ ai.loading ? 'O modelo está sendo preparado. Você pode escrever sua pergunta enquanto aguarda.' : ai.provider === 'browser' ? 'Configure um modelo para começar. O download só inicia no botão Baixar e iniciar IA gratuita.' : 'Busque os modelos instalados no Ollama e selecione um para começar.' }}</p>
      <div class="assistant-composer-footer"><div class="assistant-composer-hint"><span>{{ ai.question.length }} / 3000</span><span>Ctrl / ⌘ + Enter para enviar</span></div><v-btn v-if="ai.busy" color="primary" variant="tonal" prepend-icon="mdi-stop" @click="ai.stop(); sync.persistState()">Interromper</v-btn><v-btn v-else-if="workspace.deskMode && requiresSetup" type="button" color="primary" variant="flat" prepend-icon="mdi-cog-outline" :disabled="ai.loading" @click="openConfiguration">{{ ai.loading ? 'Preparando IA…' : 'Configurar IA' }}</v-btn><v-btn v-else type="submit" color="primary" variant="flat" prepend-icon="mdi-arrow-up" :disabled="!ai.question.trim() || ai.loading">Perguntar</v-btn></div>
    </v-form>
    <details class="assistant-research" :open="!workspace.deskMode"><summary v-show="workspace.deskMode">Pesquisar referências</summary><ResearchLibrary /></details>
    <details class="text-sm assistant-sources"><summary style="cursor:pointer" class="text-medium-emphasis">Biblioteca de fontes para consulta</summary><p class="text-xs text-medium-emphasis mt-3">Links de referência. O tutor não pesquisa automaticamente nessas páginas.</p><div class="flex flex-wrap gap-2 mt-3"><v-btn v-for="source in OFFICIAL_SOURCES" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" size="small" variant="outlined">{{ source.name }}</v-btn></div></details>
  </section>
</template>
<script setup>
import { apiFetch } from '../services/api';
import ResearchLibrary from '../components/ResearchLibrary.vue';
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAssistantStore } from '../stores/useAssistantStore';
import { useRecordsStore } from '../stores/useRecordsStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { htmlToPlainText } from '../utils/text';
import { OFFICIAL_SOURCES } from '../utils/constants';
import { releaseBrowserAi } from '../services/browserAi';
const ai = useAssistantStore(), records = useRecordsStore(), sync = useSyncStore(), app = useAppStore();
const workspace = useWorkspaceStore(), configuration = ref(null);
const requiresSetup = computed(() => ai.provider === 'browser' ? !ai.ready : ai.provider === 'ollama' && !ai.ollamaModel.trim());
const browserModels = [{ title: 'Qwen 2.5 · 1.5B · mais capacidade, mais memória', value: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' }, { title: 'Qwen 2.5 · 0.5B · multilíngue', value: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC' }, { title: 'SmolLM2 · 360M · mais leve', value: 'SmolLM2-360M-Instruct-q4f16_1-MLC' }];
const checkingOllama = ref(false), ollamaError = ref(''), ollamaModels = ref([]);
const contextOptions = computed(() => [...(records.draft ? [{ id: '__draft__', title: 'Rascunho aberto no caderno' }] : []), ...records.records.map(r => ({ id: r.id, title: r.title }))]);
const prompts = [ { label: 'Entender um conceito', icon: 'mdi-lightbulb-outline', hint: 'Explicação com exemplos', text: 'Explique o conceito de [tema] com exemplos e depois me faça uma pergunta para verificar se entendi.' }, { label: 'Praticar para a prova', icon: 'mdi-school-outline', hint: 'Recuperação ativa', text: 'Crie 3 perguntas sobre o material escolhido. Não mostre as respostas ainda; quero tentar responder primeiro.' }, { label: 'Revisar minhas notas', icon: 'mdi-text-box-search-outline', hint: 'Encontre lacunas e conexões', text: 'Com base no material escolhido, resuma os conceitos principais e aponte o que preciso aprofundar.' } ];
watch(() => ai.question, () => sync.persistState());
const renderMarkdown = value => DOMPurify.sanitize(marked.parse(value), { USE_PROFILES: { html: true }, FORBID_TAGS: ['img', 'iframe', 'style', 'input'] });
function submit() {
  if (workspace.deskMode && requiresSetup.value) { openConfiguration(); return; }
  const record = ai.contextId === '__draft__' ? records.draft : records.records.find(r => r.id === ai.contextId);
  const context = ai.contextId === '__draft__' ? htmlToPlainText(record?.html || '') : htmlToPlainText(record?.contentHtml || record?.content || '');
  ai.ask(context);
}
function openConfiguration() {
  if (!configuration.value) return;
  configuration.value.open = true;
  configuration.value.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  configuration.value.querySelector('summary')?.focus();
}
async function checkOllama() { checkingOllama.value = true; ollamaError.value = ''; try { const response = await apiFetch('/api/study-ai'); const data = await response.json(); if (!response.ok) throw new Error(data.error); ollamaModels.value = data.models; if (!ollamaModels.value.includes(ai.ollamaModel)) ai.ollamaModel = data.models[0] || ''; if (!data.models.length) ollamaError.value = 'Ollama conectado, mas nenhum modelo instalado. Baixe um modelo no Ollama.'; } catch (error) { ollamaError.value = error.message || 'Inicie o backend e o Ollama para buscar modelos.'; } finally { checkingOllama.value = false; } }
function saveNote(message) { records.addRecord({ title: `Estudo: ${ai.messages.filter(m => m.role === 'user').at(-1)?.content.slice(0, 65) || 'Resposta do tutor'}`, type: 'anotacao', subjectId: '', dueDate: '', status: 'em_andamento', content: message.content, contentHtml: renderMarkdown(message.content), studyMinutes: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); sync.persistState(); }
async function copy(text) { try { await navigator.clipboard.writeText(text); app.showToast('Resposta copiada.'); } catch { app.showToast('Não foi possível copiar. Selecione o texto da resposta.'); } }
function releaseModel() { ai.stop(); releaseBrowserAi(); ai.ready = false; ai.progress = ''; }
function cancelLoading() { releaseModel(); }
</script>
<style scoped>
.assistant-intro { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
.assistant-welcome { display:grid; justify-items:center; gap:14px; padding:22px 0; text-align:center; }
.assistant-prompts { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; width:100%; }
.assistant-prompts button { display:flex; flex-direction:column; align-items:flex-start; gap:9px; text-align:left; padding:18px; border:1px solid var(--surface-border); border-radius:12px; color:var(--app-text); background:var(--surface); cursor:pointer; }
.assistant-prompts button:hover { border-color:rgb(var(--gold-500)); }
.assistant-prompts strong { font-size:12px; }
.assistant-prompts small { font-size:11px; color:var(--app-muted); }
.assistant-messages { display:grid; gap:14px; }
.assistant-message { border:1px solid var(--surface-border); border-radius:14px; padding:20px; background:var(--notebook-paper); overflow-wrap:anywhere; font-size:14px; line-height:1.8; }
.assistant-message--user { background:rgb(var(--gold-500) / .08); margin-left:24px; }
.assistant-composer { background:var(--surface); border:1px solid var(--surface-border); border-radius:18px; padding:18px 20px 14px; transition:border-color .15s,box-shadow .15s; }
.assistant-composer:focus-within { border-color:rgb(var(--gold-500) / .65); box-shadow:0 0 0 3px rgb(var(--gold-500) / .08); }
.assistant-composer-label { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--app-muted); cursor:text; }
.assistant-composer :deep(.v-field__input) { padding:12px 0; font-size:15px; line-height:1.7; mask-image:none; }
.assistant-composer :deep(.v-field) { --v-field-padding-top:0px; }
.assistant-composer-footer { display:flex; align-items:center; justify-content:space-between; gap:14px; border-top:1px solid var(--surface-border); padding-top:12px; }
.assistant-composer-hint { display:flex; flex-wrap:wrap; gap:6px 14px; color:var(--app-muted); font-size:10px; line-height:1.6; }
.assistant-composer-footer .v-btn { flex-shrink:0; text-transform:none; letter-spacing:0; border-radius:10px; }
.assistant-configuration summary,.assistant-research > summary { cursor:pointer; line-height:1.6; }
.assistant-configuration__status { color:var(--app-muted); font-size:13px; font-weight:500; }
.assistant-research[open] > summary { margin-bottom:16px; }
.assistant-setup-hint { margin:0 0 12px; color:var(--app-muted); font-size:13px; line-height:1.65; }
.assistant-section--desk { display:flex; flex-direction:column; gap:16px; }
.assistant-section--desk .assistant-intro { display:none; }
.assistant-section--desk .assistant-configuration { order:1; }
.assistant-section--desk .assistant-context { order:2; padding:16px; }
.assistant-section--desk .assistant-messages { order:3; }
.assistant-section--desk .assistant-error { order:4; }
.assistant-section--desk .assistant-composer { order:5; padding:16px; }
.assistant-section--desk .assistant-welcome { order:6; gap:12px; padding:8px 0; }
.assistant-section--desk .assistant-welcome > .v-icon { display:none; }
.assistant-section--desk .assistant-welcome h3 { font-size:16px; }
.assistant-section--desk .assistant-prompts { grid-template-columns:1fr; gap:8px; }
.assistant-section--desk .assistant-prompts button { flex-direction:row; align-items:center; padding:12px; gap:10px; }
.assistant-section--desk .assistant-prompts strong { font-size:13px; }
.assistant-section--desk .assistant-prompts small { display:none; }
.assistant-section--desk .assistant-research { order:7; padding-top:12px; border-top:1px solid var(--surface-border); }
.assistant-section--desk .assistant-sources { order:8; }
.assistant-section--desk .assistant-composer-footer { flex-wrap:wrap; gap:10px; }
.assistant-section--desk .assistant-composer-hint { font-size:11px; }
@container(max-width:450px) { .assistant-composer { padding:15px; } .assistant-composer-hint { flex-direction:column; } }
@container(max-width:700px) { .assistant-prompts { grid-template-columns:1fr; } .assistant-intro { flex-wrap:wrap; } }
</style>
