<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Matérias</h2>
      <p class="text-sm text-medium-emphasis mb-5">Gerencie suas disciplinas e professores</p>
      <v-form @submit.prevent="submitSubject">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model.trim="subjectForm.name" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model.trim="subjectForm.professorName" label="Professor(a)" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model.trim="subjectForm.professorEmail" label="E-mail" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="subjectForm.professorContact" label="Contato" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="subjectForm.color" label="Cor" type="color" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12">
            <div class="flex flex-wrap gap-3">
              <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
                {{ subjectEditId ? 'Atualizar matéria' : 'Salvar matéria' }}
              </v-btn>
              <v-btn
                v-if="subjectEditId"
                color="secondary"
                variant="outlined"
                height="44"
                @click="cancelSubjectEdit"
              >
                Cancelar edição
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <v-row>
      <v-col v-for="subject in subjectsStore.subjects" :key="subject.id" cols="12" sm="6" lg="4">
        <div class="glass-card p-5" style="height: 100%">
          <div class="flex justify-between items-start mb-3">
            <h3 class="text-base font-bold text-high-emphasis">{{ subject.name }}</h3>
            <span :style="{ backgroundColor: subject.color, width: '14px', height: '14px', borderRadius: '50%', flexShrink: '0', marginTop: '4px' }"></span>
          </div>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Prof.</span> {{ subject.professorName }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">E-mail</span> {{ subject.professorEmail || '---' }}</p>
          <p class="text-sm text-medium-emphasis mb-4"><span class="font-semibold text-high-emphasis">Contato</span> {{ subject.professorContact || '---' }}</p>
          <div class="flex flex-wrap gap-2">
            <v-btn size="small" color="primary" variant="outlined" @click="startSubjectEdit(subject.id)">Editar</v-btn>
            <v-btn size="small" color="error" variant="outlined" @click="removeSubject(subject.id)">Remover</v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useAppStore } from '../stores/useAppStore';
import { createSubjectForm } from '../utils/helpers';
import { useDebouncedPersist } from '../composables/useDebouncedPersist';

const subjectsStore = useSubjectsStore();
const appStore = useAppStore();
const persist = useDebouncedPersist(500);

const subjectForm = ref(createSubjectForm());
const subjectEditId = ref('');

const resetSubjectForm = () => {
  subjectForm.value = createSubjectForm();
  subjectEditId.value = '';
};

const submitSubject = () => {
  const success = subjectsStore.addSubject(subjectForm.value, subjectEditId.value);
  if (success) {
    resetSubjectForm();
    persist();
  }
};

const startSubjectEdit = (id) => {
  const subject = subjectsStore.subjects.find((item) => item.id === id);
  if (!subject) return;
  subjectEditId.value = subject.id;
  subjectForm.value = createSubjectForm({
    name: subject.name,
    professorName: subject.professorName,
    professorEmail: subject.professorEmail,
    professorContact: subject.professorContact,
    color: subject.color
  });
  appStore.showToast(`Editando matéria: ${subject.name}`);
};

const cancelSubjectEdit = () => {
  resetSubjectForm();
  appStore.showToast('Edição de matéria cancelada.');
};

const removeSubject = (id) => {
  subjectsStore.removeSubject(id);
  persist();
  if (subjectEditId.value === id) {
    resetSubjectForm();
  }
};
</script>
