<template>
  <section class="grid gap-6">

    <!-- Formulário manual -->
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Horários</h2>
      <p class="text-sm text-medium-emphasis mb-5">Configure sua grade semanal de aulas</p>
      <v-form @submit.prevent="ctx.addTimetable">
        <v-row>
          <v-col cols="12" md="4">
            <v-select v-model="ctx.timetableForm.subjectId" :items="ctx.state.subjects" item-title="name" item-value="id" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model.number="ctx.timetableForm.day" :items="ctx.dayOptions" item-title="label" item-value="value" label="Dia" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="ctx.timetableForm.start" label="Início" type="time" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="ctx.timetableForm.end" label="Fim" type="time" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model.number="ctx.timetableForm.notifyMinutes" label="Lembrete (min)" type="number" min="0" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="8">
            <v-text-field v-model.trim="ctx.timetableForm.place" label="Local" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="4" class="flex items-center">
            <div class="flex flex-wrap gap-3">
              <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
                {{ ctx.timetableEditId ? 'Atualizar horário' : 'Adicionar horário' }}
              </v-btn>
              <v-btn v-if="ctx.timetableEditId" color="secondary" variant="outlined" height="44" @click="ctx.cancelTimetableEdit">
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
          <tr v-for="item in ctx.orderedTimetable" :key="item.id">
            <td class="text-sm font-medium">{{ ctx.dayLabel(item.day) }}</td>
            <td class="text-sm">{{ ctx.subjectName(item.subjectId) }}</td>
            <td class="text-sm">{{ item.start }}</td>
            <td class="text-sm">{{ item.end }}</td>
            <td class="text-sm text-medium-emphasis">{{ item.place || '---' }}</td>
            <td>
              <div class="flex gap-1">
                <v-btn size="small" color="primary" variant="text" @click="ctx.startTimetableEdit(item.id)">Editar</v-btn>
                <v-btn size="small" color="error" variant="text" @click="ctx.removeTimetable(item.id)">Remover</v-btn>
              </div>
            </td>
          </tr>
          <tr v-if="!ctx.orderedTimetable.length">
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
      <div class="flex flex-wrap items-center gap-4">
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.docx"
          class="hidden"
          @change="ctx.onTimetableFileImport"
        />
        <v-btn
          color="primary"
          variant="flat"
          height="44"
          class="font-semibold"
          prepend-icon="mdi-file-upload-outline"
          :loading="ctx.timetableImport.busy"
          :disabled="ctx.timetableImport.busy"
          @click="fileInput.click()"
        >
          Selecionar arquivo
        </v-btn>
        <span class="text-xs text-medium-emphasis">Formatos aceitos: .docx, .pdf</span>
      </div>

      <!-- Status da importação -->
      <div
        v-if="ctx.timetableImport.status"
        class="mt-4 px-4 py-3 rounded-xl text-sm"
        :class="ctx.timetableImport.busy
          ? 'bg-dark-700 bg-opacity-50 text-medium-emphasis'
          : ctx.timetableImport.parsed.length
            ? 'bg-primary bg-opacity-10 text-primary'
            : 'bg-dark-700 bg-opacity-50 text-medium-emphasis'"
      >
        <span v-if="ctx.timetableImport.busy" class="flex items-center gap-2">
          <v-progress-circular indeterminate size="14" width="2" color="primary" />
          {{ ctx.timetableImport.status }}
        </span>
        <span v-else>{{ ctx.timetableImport.status }}</span>
      </div>

      <!-- Preview dos horários encontrados -->
      <div v-if="ctx.timetableImport.parsed.length" class="mt-6">
        <p class="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
          Revise antes de confirmar
        </p>

        <div class="overflow-x-auto rounded-xl border border-dark-600 border-opacity-30">
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
              <tr v-for="(entry, i) in ctx.timetableImport.parsed" :key="i">
                <td class="font-medium">{{ ctx.dayLabel(entry.day) }}</td>
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
                    @click="ctx.removeImportedEntry(i)"
                  >
                    <v-icon size="16">mdi-close</v-icon>
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap gap-3 mt-4">
          <v-btn
            color="primary"
            variant="flat"
            height="44"
            class="font-semibold"
            prepend-icon="mdi-check"
            @click="ctx.confirmImportTimetable"
          >
            Confirmar importação ({{ ctx.timetableImport.parsed.length }})
          </v-btn>
          <v-btn
            color="secondary"
            variant="outlined"
            height="44"
            @click="ctx.timetableImport.parsed = []"
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

const props = defineProps({
  ctx: {
    type: Object,
    required: true
  }
});

const fileInput = ref(null);
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
</style>
