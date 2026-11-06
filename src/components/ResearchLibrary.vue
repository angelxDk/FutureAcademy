<template>
  <details class="glass-card p-5 research-library">
    <summary class="font-semibold" style="cursor:pointer"><v-icon icon="mdi-book-search-outline" size="18" /> Pesquisar artigos e guardar referências</summary>
    <p class="text-xs text-medium-emphasis mt-3 mb-4">Busca gratuita de metadados na Crossref, sem cadastro. O texto completo de cada publicação pode exigir acesso.</p>
    <v-form class="flex gap-2 items-center" @submit.prevent="search"><v-text-field v-model.trim="query" label="Tema, autor ou título" variant="outlined" density="compact" hide-details maxlength="200" /><v-btn type="submit" color="primary" variant="tonal" :loading="busy" :disabled="query.length < 3">Buscar</v-btn></v-form>
    <p v-if="error" class="text-sm text-error mt-3" role="alert">{{ error }}</p>
    <p v-else-if="searched && !results.length" class="empty-copy">Nenhuma referência encontrada. Tente outros termos.</p>
    <div v-for="item in results" :key="item.doi" class="research-result"><h3>{{ item.title }}</h3><p>{{ item.authors }} · {{ item.year || 'Ano não informado' }}</p><p>{{ item.journal }}</p><div class="flex gap-2 mt-2"><v-btn :href="item.url" target="_blank" rel="noopener noreferrer" size="x-small" variant="text">Abrir DOI</v-btn><v-btn size="x-small" variant="text" prepend-icon="mdi-notebook-plus-outline" @click="saveReference(item)">Guardar referência</v-btn></div></div>
    <p v-if="searched" class="text-xs text-medium-emphasis mt-3">Fonte: Crossref · dados bibliográficos retornados pela API, não gerados pela IA.</p>
  </details>
</template>
<script setup>
import { ref } from 'vue';
import { useRecordsStore } from '../stores/useRecordsStore';
import { useSyncStore } from '../stores/useSyncStore';
import { plainTextToHtml } from '../utils/text';
const records = useRecordsStore(), sync = useSyncStore();
const query = ref(''), busy = ref(false), error = ref(''), results = ref([]), searched = ref(false);
async function search() {
  if (busy.value || query.value.length < 3) return;
  busy.value = true; error.value = ''; results.value = []; searched.value = true;
  try {
    const params = new URLSearchParams({ query: query.value, rows: '5', select: 'DOI,title,author,published,container-title' });
    const response = await fetch(`https://api.crossref.org/works?${params}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 429 ? 'Limite temporário da Crossref. Aguarde um pouco e tente novamente.' : 'A busca não está disponível agora.');
    const data = await response.json();
    results.value = (data.message?.items || []).filter(item => item.DOI).map(item => ({ doi: item.DOI, url: `https://doi.org/${encodeURI(item.DOI).replace(/#/g, '%23').replace(/\?/g, '%3F')}`, title: item.title?.[0] || 'Sem título', authors: (item.author || []).slice(0, 4).map(author => [author.given, author.family].filter(Boolean).join(' ')).join('; ') || 'Autoria não informada', year: item.published?.['date-parts']?.[0]?.[0], journal: item['container-title']?.[0] || '' }));
  } catch (err) { error.value = err.name === 'TimeoutError' ? 'A busca demorou para responder. Tente novamente.' : err.message || 'Não foi possível conectar à Crossref.'; }
  finally { busy.value = false; }
}
function saveReference(item) {
  const content = `${item.authors}. ${item.title}. ${item.journal}. ${item.year || 's.d.'}. DOI: ${item.doi}. ${item.url}`;
  records.addRecord({ title: `Referência: ${item.title}`, type: 'anotacao', status: 'concluido', subjectId: '', dueDate: '', content, contentHtml: plainTextToHtml(content), studyMinutes: 0, createdAt: new Date().toISOString() });
  sync.persistState();
}
</script>
<style scoped>
.research-result { padding:17px 0; border-bottom:1px solid var(--surface-border); }
.research-result h3 { font-size:13px; line-height:1.7; }
.research-result p { font-size:11px; color:var(--app-muted); margin-top:4px; }
</style>
