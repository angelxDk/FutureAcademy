<template>
  <section class="grid gap-6">

    <!-- Formulário manual -->
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Horários</h2>
      <p class="text-sm text-medium-emphasis mb-5">Configure sua grade semanal de aulas</p>
      <v-form @submit.prevent="submitTimetable">
        <v-row>
          <v-col cols="12" md="4">
            <v-select v-model="timetableForm.subjectId" :items="subjectsStore.subjects" item-title="name" item-value="id" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model.number="timetableForm.day" :items="DAY_OPTIONS" item-title="label" item-value="value" label="Dia" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="timetableForm.start" label="Início" type="time" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="timetableForm.end" label="Fim" type="time" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model.number="timetableForm.notifyMinutes" label="Lembrete (min)" type="number" min="0" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="8">
            <v-text-field v-model.trim="timetableForm.place" label="Local" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <div class="d-flex flex-wrap ga-3">
              <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
                {{ timetableEditId ? 'Atualizar horário' : 'Adicionar horário' }}
              </v-btn>
              <v-btn v-if="timetableEditId" color="secondary" variant="outlined" height="44" @click="cancelTimetableEdit">
                Cancelar
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <!-- Tabela de horários -->
    <div class="glass-card overflow-hidden">
      <v-table class="timetable-table">
        <thead>
          <tr>
            <th class="text-xs uppercase tracking-wider font-semibold">Dia</th>
            <th class="text-xs uppercase tracking-wider font-semibold">Matéria</th>
            <th class="text-xs uppercase tracking-wider font-semibold">Início</th>
            <th class="text-xs uppercase tracking-wider font-semibold">Fim</th>
            <th class="text-xs uppercase tracking-wider font-semibold">Local</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in timetableStore.orderedTimetable" :key="item.id">
            <td class="text-sm font-medium">{{ dayLabel(item.day) }}</td>
            <td class="text-sm">{{ subjectName(item.subjectId) }}</td>
            <td class="text-sm">{{ item.start }}</td>
            <td class="text-sm">{{ item.end }}</td>
            <td class="text-sm text-medium-emphasis">{{ item.place || '---' }}</td>
            <td>
              <div class="d-flex ga-1">
                <v-btn size="small" color="primary" variant="text" @click="startTimetableEdit(item.id)">Editar</v-btn>
                <v-btn size="small" color="error" variant="text" @click="removeTimetable(item.id)">Remover</v-btn>
              </div>
            </td>
          </tr>
          <tr v-if="!timetableStore.orderedTimetable.length">
            <td colspan="6" class="text-sm text-medium-emphasis text-center py-6">Nenhum horário cadastrado ainda.</td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <!-- Importar horários -->
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Importar Horários</h2>
      <p class="text-sm text-medium-emphasis mb-5">
        Envie um arquivo <strong>.docx</strong> ou <strong>.pdf</strong> com a grade horária — a IA extrai e cadastra automaticamente.
      </p>

      <!-- Botão de upload -->
      <div class="d-flex flex-wrap align-center ga-4">
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.docx"
          class="d-none"
          @change="onTimetableFileImport"
        />
        <v-btn
          color="primary"
          variant="flat"
          height="44"
          class="font-semibold"
          prepend-icon="mdi-file-upload-outline"
          :loading="timetableImport.busy"
          :disabled="timetableImport.busy"
          @click="fileInput.click()"
        >
          Selecionar arquivo
        </v-btn>
        <span class="text-xs text-medium-emphasis">Formatos aceitos: .docx, .pdf</span>
      </div>

      <!-- Status da importação -->
      <div
        v-if="timetableImport.status"
        class="mt-4 px-4 py-3 rounded-xl text-sm import-status"
        :class="timetableImport.busy
          ? 'import-status--busy'
          : timetableImport.parsed.length
            ? 'import-status--success'
            : 'import-status--busy'"
      >
        <span v-if="timetableImport.busy" class="d-flex align-center ga-2">
          <v-progress-circular indeterminate size="14" width="2" color="primary" />
          {{ timetableImport.status }}
        </span>
        <span v-else>{{ timetableImport.status }}</span>
      </div>

      <!-- Preview dos horários encontrados -->
      <div v-if="timetableImport.parsed.length" class="mt-6">
        <p class="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
          Revise antes de confirmar
        </p>

        <div class="overflow-x-auto rounded-xl import-table-border">
          <table class="import-tt w-full text-sm">
            <thead>
              <tr>
                <th>Dia</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Matéria</th>
                <th>Professor(a)</th>
                <th>Local</th>
                <th class="w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, i) in timetableImport.parsed" :key="i">
                <td class="font-medium">{{ dayLabel(entry.day) }}</td>
                <td>{{ entry.start }}</td>
                <td>{{ entry.end }}</td>
                <td>{{ entry.subjectName || '—' }}</td>
                <td class="text-medium-emphasis">{{ entry.professorName || '—' }}</td>
                <td class="text-medium-emphasis">{{ entry.place || '—' }}</td>
                <td>
                  <v-btn
                    size="x-small"
                    color="error"
                    variant="text"
                    icon
                    @click="removeImportedEntry(i)"
                  >
                    <v-icon size="16">mdi-close</v-icon>
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap ga-3 mt-4">
          <v-btn
            color="primary"
            variant="flat"
            height="44"
            class="font-semibold"
            prepend-icon="mdi-check"
            @click="confirmImportTimetable"
          >
            Confirmar importação ({{ timetableImport.parsed.length }})
          </v-btn>
          <v-btn
            color="secondary"
            variant="outlined"
            height="44"
            @click="timetableImport.parsed = []"
          >
            Descartar
          </v-btn>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useTimetableStore } from '../stores/useTimetableStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useUserStore } from '../stores/useUserStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';
import { DAY_OPTIONS } from '../utils/constants';
import { uid, createTimetableForm, createSubjectForm } from '../utils/helpers';

const timetableStore = useTimetableStore();
const subjectsStore = useSubjectsStore();
const userStore = useUserStore();
const syncStore = useSyncStore();
const appStore = useAppStore();

const fileInput = ref(null);

const timetableForm = ref(createTimetableForm());
const timetableEditId = ref('');

const resetTimetableForm = () => {
  timetableForm.value = createTimetableForm();
  timetableEditId.value = '';
};

const submitTimetable = () => {
  const success = timetableStore.addTimetable(timetableForm.value, timetableEditId.value);
  if (success) resetTimetableForm();
  syncStore.persistState();
};

const startTimetableEdit = (id) => {
  const item = timetableStore.timetable.find((t) => t.id === id);
  if (!item) return;
  timetableEditId.value = item.id;
  timetableForm.value = createTimetableForm({
    subjectId: item.subjectId,
    day: item.day,
    start: item.start,
    end: item.end,
    place: item.place,
    notifyMinutes: item.notifyMinutes
  });
  appStore.showToast('Editando horário...');
};

const cancelTimetableEdit = () => {
  resetTimetableForm();
  appStore.showToast('Edição cancelada.');
};

const removeTimetable = (id) => {
  timetableStore.removeTimetable(id);
  syncStore.persistState();
  if (timetableEditId.value === id) resetTimetableForm();
};

const dayLabel = (val) => DAY_OPTIONS.find((d) => d.value === val)?.label || 'Desconhecido';
const subjectName = (id) => subjectsStore.subjects.find((s) => s.id === id)?.name || 'Sem matéria';

// --- AI Import Logic ---
const timetableImport = ref({
  busy: false,
  status: '',
  rawText: '',
  parsed: [],
  newSubjects: []
});

// ── Extrai tabela estruturada de DOCX via HTML (mammoth.convertToHtml) ──
const extractTableFromDocx = async (file) => {
  if (typeof window.mammoth === 'undefined') throw new Error('Biblioteca mammoth.js não carregada.');
  const arrayBuffer = await file.arrayBuffer();

  // Converte para HTML para preservar estrutura de tabela
  const htmlResult = await window.mammoth.convertToHtml({ arrayBuffer });
  const html = htmlResult.value || '';

  if (!html.trim()) throw new Error('O arquivo .docx parece estar vazio.');

  // Parseia o HTML no browser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  if (tables.length > 0) {
    // Usa a primeira tabela (a grade horária)
    const table = tables[0];
    const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent.trim())
    ).filter(row => row.length > 0);

    return { type: 'table', rows };
  }

  // Fallback: sem tabela, extrai texto plano
  const textResult = await window.mammoth.extractRawText({ arrayBuffer });
  return { type: 'text', content: textResult.value || '' };
};

// ── Extrai texto de PDF com posicionamento por coluna ──
const extractStructuredFromPdf = async (file) => {
  if (typeof window.pdfjsLib === 'undefined') throw new Error('Biblioteca pdf.js não carregada.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allItems = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    // Coleta itens com posição x,y
    content.items.forEach(item => {
      if (!item.str.trim()) return;
      const [,, , , x, y] = item.transform;
      allItems.push({ str: item.str.trim(), x: Math.round(x), y: Math.round(viewport.height - y) });
    });
  }

  if (!allItems.length) return { type: 'text', content: '' };

  // Agrupa por linha (y próximos = mesma linha)
  allItems.sort((a, b) => a.y - b.y || a.x - b.x);
  const lineGroups = [];
  let currentY = -9999;
  let currentGroup = [];
  const Y_TOLERANCE = 5;

  for (const item of allItems) {
    if (Math.abs(item.y - currentY) > Y_TOLERANCE) {
      if (currentGroup.length) lineGroups.push(currentGroup);
      currentGroup = [item];
      currentY = item.y;
    } else {
      currentGroup.push(item);
    }
  }
  if (currentGroup.length) lineGroups.push(currentGroup);

  // Detecta colunas pelo cabeçalho (linha com dias da semana)
  const DAY_PATTERNS = ['segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado'];
  let headerLineIdx = -1;
  let columnBoundaries = []; // Array de x-iniciais de colunas

  for (let i = 0; i < Math.min(lineGroups.length, 15); i++) {
    const lineText = lineGroups[i].map(it => it.str).join(' ').toLowerCase();
    const dayCount = DAY_PATTERNS.filter(d => lineText.includes(d)).length;
    if (dayCount >= 2) {
      headerLineIdx = i;
      // Cada item no cabeçalho é uma coluna
      columnBoundaries = lineGroups[i].map(it => it.x);
      break;
    }
  }

  if (headerLineIdx === -1 || columnBoundaries.length < 3) {
    // Sem cabeçalho detectado: retorna texto simples
    const text = lineGroups.map(g => g.map(it => it.str).join(' ')).join('\n');
    return { type: 'text', content: text };
  }

  // Reconstrói tabela: para cada grupo de linha, atribui item a coluna pelo x mais próximo
  const numCols = columnBoundaries.length;
  const tableRows = [];

  for (let i = 0; i <= headerLineIdx; i++) {
    const row = new Array(numCols).fill('');
    for (const item of lineGroups[i]) {
      let col = 0;
      let minDist = Infinity;
      columnBoundaries.forEach((bx, ci) => {
        const dist = Math.abs(item.x - bx);
        if (dist < minDist) { minDist = dist; col = ci; }
      });
      row[col] = row[col] ? row[col] + ' ' + item.str : item.str;
    }
    tableRows.push(row);
  }

  // Linhas de dados: agrupa linhas próximas por bloco de horário
  for (let i = headerLineIdx + 1; i < lineGroups.length; i++) {
    const row = new Array(numCols).fill('');
    for (const item of lineGroups[i]) {
      let col = 0;
      let minDist = Infinity;
      columnBoundaries.forEach((bx, ci) => {
        // Usa tolerância maior para dados (células podem ser mais largas)
        const dist = Math.abs(item.x - bx);
        if (dist < minDist) { minDist = dist; col = ci; }
      });
      row[col] = row[col] ? row[col] + ' ' + item.str : item.str;
    }
    tableRows.push(row);
  }

  return { type: 'table', rows: tableRows };
};

const onTimetableFileImport = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  timetableImport.value.busy = true;
  timetableImport.value.status = 'Lendo arquivo...';
  timetableImport.value.parsed = [];

  try {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let payload;

    if (ext === 'pdf') {
      timetableImport.value.status = 'Extraindo dados do PDF...';
      payload = await extractStructuredFromPdf(file);
    } else if (ext === 'docx') {
      timetableImport.value.status = 'Extraindo tabela do DOCX...';
      payload = await extractTableFromDocx(file);
    } else {
      appStore.showToast('Formato não suportado. Use .pdf ou .docx.');
      timetableImport.value.busy = false;
      return;
    }

    if (payload.type === 'text' && !payload.content?.trim()) {
      timetableImport.value.status = 'Nenhum conteúdo encontrado no arquivo.';
      return;
    }
    if (payload.type === 'table' && !payload.rows?.length) {
      timetableImport.value.status = 'Tabela não encontrada no arquivo.';
      return;
    }

    timetableImport.value.status = 'Processando grade horária...';

    const aiReq = await fetch('/api/parse-timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await aiReq.json().catch(() => null);
    if (!aiReq.ok) throw new Error(data?.error || `Servidor retornou HTTP ${aiReq.status}`);

    timetableImport.value.parsed = data.timetable || [];
    timetableImport.value.newSubjects = data.subjects || [];

    if (timetableImport.value.parsed.length) {
      timetableImport.value.status = `${timetableImport.value.parsed.length} horário(s) encontrado(s). Revise a importação.`;
    } else {
      timetableImport.value.status = 'Nenhum horário identificado no arquivo.';
    }
    appStore.showToast(`Arquivo "${file.name}" processado.`);
  } catch (err) {
    timetableImport.value.status = `Erro ao processar: ${err.message || 'falha inesperada'}`;
    appStore.showToast('Erro ao importar arquivo.');
  } finally {
    timetableImport.value.busy = false;
  }
};

const removeImportedEntry = (index) => {
  timetableImport.value.parsed.splice(index, 1);
};

const confirmImportTimetable = () => {
  const entries = timetableImport.value.parsed || [];
  const newSubjects = timetableImport.value.newSubjects || [];
  if (!entries.length) {
    appStore.showToast('Nenhum horário para importar.');
    return;
  }

  let addedSubjects = 0;
  newSubjects.forEach((subReq) => {
    let existing = subjectsStore.subjects.find((s) => s.name.toLowerCase() === subReq.name.toLowerCase());
    if (!existing) {
      const newSub = createSubjectForm({
        name: subReq.name,
        professorName: subReq.professorName || '',
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
      });
      newSub.id = uid();
      subjectsStore.subjects.push(newSub);
      addedSubjects++;
    }
  });

  entries.forEach((entry) => {
    let subId = '';
    if (entry.subjectName) {
      let found = subjectsStore.subjects.find((s) => s.name.toLowerCase() === entry.subjectName.toLowerCase());
      if (found) subId = found.id;
    }
    timetableStore.timetable.push({
      id: uid(),
      subjectId: subId,
      day: Number(entry.day || 1),
      start: entry.start || '00:00',
      end: entry.end || '01:00',
      place: entry.place || '',
      notifyMinutes: 15
    });
  });

  syncStore.persistState();
  appStore.showToast(`Importação concluída: ${entries.length} horários e ${addedSubjects} novas matérias.`);
  timetableImport.value.parsed = [];
  timetableImport.value.newSubjects = [];
  timetableImport.value.status = '';
};
</script>

<style scoped>
.timetable-table {
  background: transparent !important;
}

.import-tt {
  border-collapse: collapse;
  background: transparent;
}

.import-tt thead th {
  padding: 8px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--dark-600), 0.8);
  border-bottom: 1px solid rgba(var(--dark-600), 0.25);
  background: rgba(0, 0, 0, 0.12);
}

.import-tt tbody td {
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid rgba(var(--dark-600), 0.12);
  vertical-align: middle;
}

.import-tt tbody tr:last-child td {
  border-bottom: none;
}

.import-tt tbody tr:hover td {
  background: rgba(var(--dark-600), 0.08);
}

/* Substituindo bg-opacity e border-opacity Tailwind */
.import-status {
  transition: background 0.2s ease, color 0.2s ease;
}
.import-status--busy {
  background: rgba(var(--dark-700), 0.5);
  color: var(--app-muted);
}
.import-status--success {
  background: rgba(var(--gold-500), 0.1);
  color: rgb(var(--gold-500));
}
.import-table-border {
  border: 1px solid rgba(var(--dark-600), 0.3);
}
</style>
