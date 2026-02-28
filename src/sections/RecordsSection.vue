<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Trabalhos e registros</h2>
      <p class="text-sm text-medium-emphasis mb-5">Editor rico estilo docs para escrever e revisar trabalhos</p>

      <v-form @submit.prevent="submitRecord">
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="recordForm.title" label="Título" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="recordForm.type" :items="['trabalho', 'prova', 'anotacao']" label="Tipo" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="recordForm.subjectId" :items="subjectsStore.subjects" item-title="name" item-value="id" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="recordForm.dueDate" label="Data limite" type="date" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="recordForm.status" :items="['pendente', 'em_andamento', 'concluido']" label="Status" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model.number="recordForm.studyMinutes" label="Minutos estudados" type="number" min="0" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="6" class="flex items-center">
            <p class="text-caption text-medium-emphasis mb-0">
              Use os botões abaixo para formatar como no Google Docs.
            </p>
          </v-col>

          <v-col cols="12">
            <div class="flex flex-wrap gap-2 mb-3">
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('bold')"><strong>B</strong></v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('italic')"><em>I</em></v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('underline')"><u>U</u></v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('formatBlock', 'H1')">H1</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('formatBlock', 'H2')">H2</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('insertUnorderedList')">Lista</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('insertOrderedList')">Num.</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="applyRecordEditorCommand('formatBlock', 'BLOCKQUOTE')">Citação</v-btn>
              <v-btn size="small" variant="outlined" color="secondary" @click="applyRecordEditorCommand('removeFormat')">Limpar</v-btn>
            </div>
            <div class="record-editor-shell">
              <div
                id="record-rich-editor"
                ref="editorRef"
                class="record-editor"
                contenteditable="true"
                spellcheck="true"
                @input="onEditorFieldInput"
              />
            </div>
          </v-col>

          <v-col cols="12">
            <div class="flex flex-wrap gap-3 mt-1">
              <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
                {{ recordEditId ? 'Atualizar registro' : 'Criar registro' }}
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

    <v-row>
      <v-col v-for="record in recordsStore.orderedRecords" :key="record.id" cols="12" lg="6">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-bold text-high-emphasis mb-2">{{ record.title }}</h3>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Matéria</span> {{ subjectNameFormatter(record.subjectId) }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Data limite</span> {{ dateFormatter(record.dueDate) }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Status</span> {{ record.status }}</p>
          <p class="text-sm text-medium-emphasis mb-3"><span class="font-semibold text-high-emphasis">Minutos</span> {{ record.studyMinutes || 0 }}</p>

          <div class="record-preview mb-4">
            <p class="text-xs text-medium-emphasis mb-1 font-semibold uppercase tracking-wider">Prévia</p>
            <p class="mb-0 text-sm">{{ record.content || 'Sem conteúdo ainda.' }}</p>
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
            <v-btn size="small" color="error" variant="outlined" @click="removeRecord(record.id)">Remover</v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRecordsStore } from '../stores/useRecordsStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';
import { uid, createRecordForm } from '../utils/helpers';
import { exportRecord, sendRecordEmail } from '../utils/exportRecord';

const recordsStore = useRecordsStore();
const subjectsStore = useSubjectsStore();
const syncStore = useSyncStore();
const appStore = useAppStore();

const editorRef = ref(null);

const recordForm = ref(createRecordForm());
const recordEditId = ref('');
const recordEditorHtml = ref('<p></p>');

const resetRecordForm = () => {
  recordForm.value = createRecordForm();
  recordEditId.value = '';
  recordEditorHtml.value = '<p></p>';
  if (editorRef.value) editorRef.value.innerHTML = '<p></p>';
};

const submitRecord = () => {
  if (!recordForm.value.title) {
    appStore.showToast('Insira o título do registro.');
    return;
  }
  const isUpdate = !!recordEditId.value;
  const targetId = isUpdate ? recordEditId.value : uid();

  const recordData = {
    ...recordForm.value,
    id: targetId,
    contentHtml: recordEditorHtml.value,
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

  syncStore.persistState();
  resetRecordForm();
};

const startRecordEdit = (id) => {
  const item = recordsStore.records.find((r) => r.id === id);
  if (!item) return;
  recordEditId.value = item.id;
  recordForm.value = createRecordForm({
    title: item.title,
    type: item.type,
    subjectId: item.subjectId,
    dueDate: item.dueDate,
    status: item.status,
    studyMinutes: item.studyMinutes
  });
  recordEditorHtml.value = item.contentHtml || '<p></p>';
  if (editorRef.value) editorRef.value.innerHTML = recordEditorHtml.value;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  appStore.showToast(`Editando: ${item.title}`);
};

const cancelRecordEdit = () => {
  resetRecordForm();
  appStore.showToast('Edição de registro cancelada.');
};

const removeRecord = (id) => {
  recordsStore.records = recordsStore.records.filter((r) => r.id !== id);
  syncStore.persistState();
  if (recordEditId.value === id) resetRecordForm();
};

const onRecordEditorInput = (html) => {
  recordEditorHtml.value = html;
};

const onEditorFieldInput = (event) => {
  onRecordEditorInput(event.target.innerHTML);
};

const applyRecordEditorCommand = (command, value = null) => {
  document.execCommand(command, false, value);
  const editor = document.getElementById('record-rich-editor');
  if (editor) {
    editor.focus();
    onRecordEditorInput(editor.innerHTML);
  }
};

const subjectNameFormatter = (id) => subjectsStore.subjects.find((s) => s.id === id)?.name || 'Sem matéria';
const dateFormatter = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : isoStr;
};

const handleExportRecord = (record) => exportRecord(record, subjectNameFormatter, dateFormatter, appStore.showToast);
const handleSendRecordEmail = (record) => sendRecordEmail(record, subjectNameFormatter, dateFormatter, appStore.showToast);

function syncEditorFromState() {
  const editor = editorRef.value;
  if (!editor) return;
  const desired = recordEditorHtml.value || '<p></p>';
  if (editor.innerHTML !== desired) {
    editor.innerHTML = desired;
  }
}

onMounted(() => {
  syncEditorFromState();
});

watch(recordEditId, () => {
  nextTick(() => syncEditorFromState());
});

watch(recordEditorHtml, () => {
  if (document.activeElement === editorRef.value) return;
  nextTick(() => syncEditorFromState());
});
</script>

<style scoped>
.record-editor-shell {
  border: 1px solid rgba(116, 73, 44, 0.24);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.65);
}

:global(html[data-theme='dark']) .record-editor-shell {
  border-color: rgba(99, 102, 241, 0.25);
  background: rgba(19, 27, 53, 0.5);
}

.record-editor {
  min-height: 220px;
  max-height: 420px;
  overflow: auto;
  padding: 14px;
  line-height: 1.55;
  outline: none;
  white-space: normal;
}

.record-preview {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--dark-700), 0.4);
  border: 1px solid rgba(var(--dark-600), 0.3);
}
</style>
