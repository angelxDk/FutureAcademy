<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Trabalhos e registros</h2>
      <p class="text-sm text-medium-emphasis mb-5">Editor rico estilo docs para escrever e revisar trabalhos</p>

      <v-form @submit.prevent="ctx.addRecord">
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="ctx.recordForm.title" label="Título" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="ctx.recordForm.type" :items="['trabalho', 'prova', 'anotacao']" label="Tipo" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="ctx.recordForm.subjectId" :items="ctx.state.subjects" item-title="name" item-value="id" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="ctx.recordForm.dueDate" label="Data limite" type="date" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="ctx.recordForm.status" :items="['pendente', 'em_andamento', 'concluido']" label="Status" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model.number="ctx.recordForm.studyMinutes" label="Minutos estudados" type="number" min="0" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="6" class="flex items-center">
            <p class="text-caption text-medium-emphasis mb-0">
              Use os botões abaixo para formatar como no Google Docs.
            </p>
          </v-col>

          <v-col cols="12">
            <div class="flex flex-wrap gap-2 mb-3">
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('bold')"><strong>B</strong></v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('italic')"><em>I</em></v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('underline')"><u>U</u></v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('formatBlock', 'H1')">H1</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('formatBlock', 'H2')">H2</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('insertUnorderedList')">Lista</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('insertOrderedList')">Num.</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="ctx.applyRecordEditorCommand('formatBlock', 'BLOCKQUOTE')">Citação</v-btn>
              <v-btn size="small" variant="outlined" color="secondary" @click="ctx.applyRecordEditorCommand('removeFormat')">Limpar</v-btn>
            </div>
            <div class="record-editor-shell">
              <div
                id="record-rich-editor"
                ref="editorRef"
                class="record-editor"
                contenteditable="true"
                spellcheck="true"
                @input="onEditorInput"
              />
            </div>
          </v-col>

          <v-col cols="12">
            <div class="flex flex-wrap gap-3 mt-1">
              <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
                {{ ctx.recordEditId ? 'Atualizar registro' : 'Criar registro' }}
              </v-btn>
              <v-btn
                v-if="ctx.recordEditId"
                color="secondary"
                variant="outlined"
                height="44"
                @click="ctx.cancelRecordEdit"
              >
                Cancelar edição
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <v-row>
      <v-col v-for="record in ctx.orderedRecords" :key="record.id" cols="12" lg="6">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-bold text-high-emphasis mb-2">{{ record.title }}</h3>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Matéria</span> {{ ctx.subjectName(record.subjectId) }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Data limite</span> {{ ctx.formatDate(record.dueDate) }}</p>
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
            <v-btn size="small" color="primary" variant="outlined" @click="ctx.startRecordEdit(record.id)">Editar</v-btn>
            <v-btn size="small" color="primary" variant="outlined" @click="ctx.exportRecord(record)">Exportar</v-btn>
            <v-btn size="small" color="secondary" variant="outlined" @click="ctx.sendRecordEmail(record)">Enviar e-mail</v-btn>
            <v-btn size="small" color="error" variant="outlined" @click="ctx.removeRecord(record.id)">Remover</v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps({
  ctx: {
    type: Object,
    required: true
  }
});

const editorRef = ref(null);

function syncEditorFromState() {
  const editor = editorRef.value;
  if (!editor) return;
  const desired = props.ctx.recordEditorHtml || '<p></p>';
  if (editor.innerHTML !== desired) {
    editor.innerHTML = desired;
  }
}

function onEditorInput(event) {
  props.ctx.onRecordEditorInput(event.target.innerHTML);
}

onMounted(() => {
  syncEditorFromState();
});

watch(
  () => props.ctx.recordEditId,
  () => {
    nextTick(() => syncEditorFromState());
  }
);

watch(
  () => props.ctx.recordEditorHtml,
  () => {
    if (document.activeElement === editorRef.value) return;
    nextTick(() => syncEditorFromState());
  }
);
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
