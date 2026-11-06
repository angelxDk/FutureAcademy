<template>
  <section class="grid gap-6 records-section">
    <div class="record-document-heading"><div><p class="eyebrow">PÁGINA EM EDIÇÃO</p><p class="text-sm text-medium-emphasis">{{ wordCount }} palavras · {{ draftMessage }}</p></div><v-btn to="/pomodoro" variant="text" size="small" prepend-icon="mdi-timer-outline">Concentrar</v-btn></div>
    <div v-if="Object.keys(recordsStore.drafts).length > 0" class="flex flex-wrap gap-2"><span class="text-xs text-medium-emphasis">Rascunhos em aberto:</span><v-btn v-for="(item, key) in recordsStore.drafts" :key="key" size="x-small" variant="tonal" @click="restoreDraft(key)">{{ item.form.title || 'Página sem título' }}</v-btn></div>
    <div class="glass-card p-6 record-writing-card">

      <v-form @submit.prevent="submitRecord">
        <v-text-field v-model.trim="recordForm.title" label="Título da página" placeholder="Uma ideia, uma aula, um novo trabalho…" variant="outlined" density="compact" hide-details color="primary" required />
        <details class="record-metadata"><summary>Disciplina, prazo e detalhes <span>· {{ draftMessage }}</span></summary><v-row class="mt-2">
          <v-col cols="12" md="2">
            <v-select v-model="recordForm.type" :items="typeOptions" label="Tipo" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="recordForm.subjectId" :items="subjectsStore.subjects" item-title="name" item-value="id" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="recordForm.dueDate" label="Data limite" type="date" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="recordForm.status" :items="statusOptions" label="Status" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model.number="recordForm.studyMinutes" label="Minutos estudados" type="number" min="0" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="6" class="flex items-center">
            <p class="text-caption text-medium-emphasis mb-0">
              {{ wordCount }} palavras · {{ draftMessage }}
            </p>
          </v-col>

        </v-row></details>
        <v-row>
          <v-col cols="12">
            <div class="flex flex-wrap gap-2 mb-3"><v-menu><template #activator="{ props }"><v-btn v-bind="props" size="small" variant="tonal" color="primary" prepend-icon="mdi-file-document-plus-outline">Usar modelo</v-btn></template><v-list density="compact"><v-list-item v-for="template in notebookTemplates" :key="template.title" :title="template.title" @click="insertTemplate(template)" /></v-list></v-menu><v-btn size="small" variant="text" prepend-icon="mdi-auto-fix" @click="openStudyAi">Estudar com IA ao lado</v-btn></div>
            <NotebookEditor v-model="recordEditorHtml" />
          </v-col>

          <v-col cols="12">
            <div class="flex flex-wrap gap-3 mt-1">
              <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
                {{ recordEditId ? 'Salvar alterações' : 'Salvar trabalho' }}
              </v-btn>
              <v-btn
                v-if="recordEditId"
                color="secondary"
                variant="outlined"
                height="44"
                @click="cancelRecordEdit"
              >
                Cancelar edição
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <div class="glass-card p-6">
      <div class="section-heading"><h2 class="text-xl">Seus trabalhos e anotações</h2><span class="text-sm text-medium-emphasis">{{ filteredRecords.length }} resultados</span></div>
      <div class="record-filters"><v-text-field v-model="search" label="Buscar título ou conteúdo" prepend-inner-icon="mdi-magnify" variant="outlined" hide-details clearable /><v-select v-model="filterStatus" :items="[{ title: 'Todos os status', value: '' }, ...statusOptions]" label="Status" variant="outlined" hide-details /><v-select v-model="filterSubject" :items="[{ id: '', name: 'Todas as disciplinas' }, ...subjectsStore.subjects]" item-title="name" item-value="id" label="Disciplina" variant="outlined" hide-details /></div>
      <p v-if="!filteredRecords.length" class="empty-copy">{{ recordsStore.records.length ? 'Nenhum trabalho corresponde aos filtros.' : 'Seu primeiro trabalho começa no editor acima.' }}</p>
    </div>
    <v-row>
      <v-col v-for="record in filteredRecords" :key="record.id" cols="12" lg="6">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-bold text-high-emphasis mb-2">{{ record.title }}</h3>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Matéria</span> {{ subjectNameFormatter(record.subjectId) }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Data limite</span> {{ dateFormatter(record.dueDate) }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Status</span> {{ statusOptions.find(s => s.value === record.status)?.title || record.status }}</p>
          <p class="text-sm text-medium-emphasis mb-3"><span class="font-semibold text-high-emphasis">Minutos</span> {{ record.studyMinutes || 0 }}</p>

          <div class="record-preview mb-4">
            <p class="text-xs text-medium-emphasis mb-1 font-semibold uppercase tracking-wider">Prévia</p>
            <p class="mb-0 text-sm">{{ preview(record) || 'Sem conteúdo ainda.' }}</p>
          </div>

          <v-row dense>
            <v-col cols="12" md="4">
              <v-select v-model="record.exportFormat" :items="['md', 'docx', 'pdf']" label="Formato" variant="outlined" density="compact" bg-color="transparent" color="primary" hide-details />
            </v-col>
            <v-col cols="12" md="8">
              <v-text-field v-model.trim="record.emailTo" label="E-mail destino" variant="outlined" density="compact" bg-color="transparent" color="primary" hide-details />
            </v-col>
          </v-row>

          <div class="flex flex-wrap gap-2 mt-4">
            <v-btn size="small" color="primary" variant="outlined" @click="startRecordEdit(record.id)">Editar</v-btn>
            <v-btn size="small" color="primary" variant="outlined" @click="handleExportRecord(record)">Exportar</v-btn>
            <v-btn size="small" color="secondary" variant="outlined" @click="handleSendRecordEmail(record)">Enviar e-mail</v-btn>
            <v-btn size="small" color="error" variant="outlined" @click="deleteId = record.id">Remover</v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
    <v-dialog v-model="deleteDialog" max-width="420"><v-card title="Remover trabalho?" text="O conteúdo deste trabalho será excluído. Exporte uma cópia se quiser guardá-lo."><v-card-actions><v-btn @click="deleteId = ''">Cancelar</v-btn><v-btn color="error" @click="removeRecord(deleteId); deleteId = ''">Remover trabalho</v-btn></v-card-actions></v-card></v-dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRecordsStore } from '../stores/useRecordsStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useAppStore } from '../stores/useAppStore';
import { todayISO } from '../utils/date';
import { uid, createRecordForm } from '../utils/helpers';
import { exportRecord, sendRecordEmail } from '../utils/exportRecord';
import { useDebouncedPersist } from '../composables/useDebouncedPersist';

import { useRoute } from 'vue-router';
import { htmlToPlainText, normalizeEditorHtml, plainTextToHtml } from '../utils/text';
import { statusOptions, typeOptions } from '../utils/academic';
import { useSyncStore } from '../stores/useSyncStore';

const route = useRoute();
const sync = useSyncStore();
const recordsStore = useRecordsStore();
const subjectsStore = useSubjectsStore();
const appStore = useAppStore();
const persist = useDebouncedPersist(500);

import NotebookEditor from '../components/NotebookEditor.vue';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
const workspace = useWorkspaceStore();
const notebookTemplates = [
  { title: 'Anotação de aula', html: '<h1>Tema da aula</h1><p>Data e disciplina:</p><h2>Conceitos principais</h2><ul><li><p>Conceito e explicação com minhas palavras</p></li></ul><h2>Exemplos e aplicações</h2><p></p><h2>Dúvidas para revisar</h2><p></p><h2>Resumo em três frases</h2><p></p>' },
  { title: 'Método Cornell', html: '<h1>Anotações Cornell</h1><h2>Perguntas e palavras-chave</h2><p>O que preciso conseguir explicar?</p><h2>Notas da aula</h2><p>Registre ideias, exemplos e conexões.</p><h2>Recuperação ativa</h2><p>Sem consultar as notas, explique os conceitos com suas palavras.</p><h2>Síntese</h2><p>Resuma o essencial em um parágrafo.</p>' },
  { title: 'Estrutura de trabalho', html: '<h1>Título do trabalho</h1><h2>Introdução</h2><p>Contexto, pergunta e objetivo.</p><h2>Desenvolvimento</h2><p>Argumentos, evidências e discussão.</p><h2>Conclusão</h2><p>Resultados e resposta à pergunta inicial.</p><h2>Referências</h2><p>Registre autor, título, ano e endereço de cada fonte consultada.</p>' },
  { title: 'Revisão para prova', html: '<h1>Plano de revisão</h1><h2>Conteúdos</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Listar os tópicos da prova</p></li><li data-type="taskItem" data-checked="false"><p>Resolver exercícios sem consultar</p></li><li data-type="taskItem" data-checked="false"><p>Revisar os erros</p></li></ul><h2>Perguntas de prática</h2><p></p><h2>O que ainda preciso estudar?</h2><p></p>' }
];
function insertTemplate(template) {
  recordEditorHtml.value = (wordCount.value ? recordEditorHtml.value : '') + template.html;
  if (!recordForm.value.title) recordForm.value.title = template.title;
}
function openStudyAi() { workspace.open('assistant', true); }


const draft = recordsStore.draft;
const blankPage = () => ({ type: route.query.new ? 'trabalho' : 'anotacao', dueDate: route.query.new ? todayISO() : '' });
const recordForm = ref(createRecordForm({ ...blankPage(), ...(draft?.form || {}) }));
const recordEditId = ref(draft?.editId || '');
const recordEditorHtml = ref(draft?.html || '<p></p>');
const search = ref(''), filterStatus = ref(''), filterSubject = ref(''), deleteId = ref('');
const deleteDialog = computed({ get: () => !!deleteId.value, set: value => { if (!value) deleteId.value = ''; } });
const preview = record => htmlToPlainText(record.contentHtml || plainTextToHtml(record.content || ''));
const wordCount = computed(() => htmlToPlainText(recordEditorHtml.value).split(/\s+/).filter(Boolean).length);
const draftMessage = computed(() => recordsStore.draft ? 'Rascunho recuperável neste dispositivo' : 'Pronto para escrever');
const filteredRecords = computed(() => recordsStore.orderedRecords.filter(record =>
  (!filterStatus.value || record.status === filterStatus.value) &&
  (!filterSubject.value || record.subjectId === filterSubject.value) &&
  `${record.title} ${preview(record)}`.toLocaleLowerCase('pt-BR').includes((search.value || '').toLocaleLowerCase('pt-BR'))
));
let switchingDocument = false;
function saveDraft() {
  if (switchingDocument) return;
  const hasContent = recordForm.value.title || wordCount.value || recordEditId.value;
  recordsStore.draft = hasContent ? { form: { ...recordForm.value }, editId: recordEditId.value, html: normalizeEditorHtml(recordEditorHtml.value) } : null;
  const key = recordEditId.value || '__new__';
  if (recordsStore.draft) recordsStore.drafts[key] = recordsStore.draft;
  else delete recordsStore.drafts[key];
  sync.persistState();
}
function restoreDraft(key) {
  saveDraft();
  const item = recordsStore.drafts[key];
  if (!item) return;
  switchingDocument = true;
  recordForm.value = createRecordForm(item.form); recordEditId.value = item.editId; recordEditorHtml.value = item.html;
  switchingDocument = false; saveDraft();
}
watch([recordForm, recordEditorHtml, recordEditId], saveDraft, { deep: true, flush: 'sync' });


const resetRecordForm = () => {
  switchingDocument = true;
  const previousId = recordEditId.value;
  delete recordsStore.drafts[previousId || '__new__'];
  const newDraft = previousId ? recordsStore.drafts.__new__ : null;
  recordForm.value = createRecordForm({ ...blankPage(), ...(newDraft?.form || {}) });
  recordEditId.value = '';
  recordEditorHtml.value = newDraft?.html || '<p></p>';
  switchingDocument = false;
  saveDraft();
};

const submitRecord = () => {
  if (!recordForm.value.title) {
    appStore.showToast('Insira o título do registro.');
    return;
  }
  if (!Number.isFinite(Number(recordForm.value.studyMinutes)) || Number(recordForm.value.studyMinutes) < 0) { appStore.showToast('Informe minutos de estudo válidos.'); return; }
  const isUpdate = !!recordEditId.value;
  const targetId = isUpdate ? recordEditId.value : uid();

  const recordData = {
    ...recordForm.value,
    id: targetId,
    contentHtml: normalizeEditorHtml(recordEditorHtml.value),
    content: htmlToPlainText(recordEditorHtml.value),
    updatedAt: new Date().toISOString()
  };

  if (!isUpdate) {
    recordData.createdAt = recordData.updatedAt;
    recordsStore.records.push(recordData);
    appStore.showToast(`Registro criado: ${recordData.title}`);
  } else {
    const idx = recordsStore.records.findIndex((r) => r.id === targetId);
    if (idx !== -1) {
      Object.assign(recordsStore.records[idx], recordData);
      appStore.showToast(`Registro atualizado: ${recordData.title}`);
    }
  }

  persist();
  resetRecordForm();
};

const startRecordEdit = (id) => {
  const item = recordsStore.records.find((r) => r.id === id);
  if (!item) return;
  saveDraft();
  if (recordsStore.drafts[id]) { restoreDraft(id); return; }
  switchingDocument = true;
  recordEditId.value = item.id;
  recordForm.value = createRecordForm({
    title: item.title,
    type: item.type || 'anotacao',
    subjectId: item.subjectId || '',
    dueDate: item.dueDate || '',
    status: item.status || 'pendente',
    studyMinutes: item.studyMinutes ?? 0
  });
  recordEditorHtml.value = normalizeEditorHtml(item.contentHtml || plainTextToHtml(item.content || ''));

  switchingDocument = false;
  saveDraft();
  appStore.showToast(`Editando: ${item.title}`);
};

const cancelRecordEdit = () => {
  resetRecordForm();
  appStore.showToast('Edição de registro cancelada.');
};

const removeRecord = (id) => {
  recordsStore.records = recordsStore.records.filter((r) => r.id !== id);
  delete recordsStore.drafts[id];
  persist();
  if (recordEditId.value === id) resetRecordForm();
};

const subjectNameFormatter = (id) => subjectsStore.subjects.find((s) => s.id === id)?.name || 'Sem matéria';
const dateFormatter = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : isoStr;
};

const handleExportRecord = (record) => exportRecord(record, subjectNameFormatter, dateFormatter, appStore.showToast);
const handleSendRecordEmail = (record) => sendRecordEmail(record, subjectNameFormatter, dateFormatter, appStore.showToast);

onMounted(() => {
  if (route.name === 'records' && route.query.edit && draft?.editId !== route.query.edit) startRecordEdit(route.query.edit);
});
watch(() => route.query.edit, id => { if (route.name === 'records' && id) startRecordEdit(id); });
</script>
