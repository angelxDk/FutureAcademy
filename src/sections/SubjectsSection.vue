<template>
  <section class="subjects-page">
    <header class="subjects-heading">
      <div><span class="subjects-eyebrow">SEU SEMESTRE, ORGANIZADO</span><h2>Uma página para cada descoberta.</h2><p>Cadastre suas disciplinas para usá-las na grade, na agenda e no caderno.</p></div>
      <v-btn color="primary" prepend-icon="mdi-plus" height="44" @click="openNewSubject">Nova disciplina</v-btn>
    </header>

    <div v-if="subjectsStore.subjects.length" class="subjects-toolbar">
      <v-text-field v-model="search" label="Buscar disciplina ou professor" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable />
      <span>{{ subjectsStore.subjects.length }} {{ subjectsStore.subjects.length === 1 ? 'disciplina' : 'disciplinas' }}</span>
    </div>

    <div v-if="!subjectsStore.subjects.length" class="subjects-empty glass-card">
      <v-icon icon="mdi-bookshelf" size="44" color="primary" /><h3>Comece pela sua primeira disciplina</h3><p>Só o nome é obrigatório. Você pode completar os detalhes depois.</p><v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" @click="openNewSubject">Cadastrar disciplina</v-btn>
    </div>
    <p v-else-if="!filteredSubjects.length" class="subjects-no-results">Nenhuma disciplina encontrada. Tente outro nome.</p>
    <div v-else class="subjects-grid">
      <article v-for="subject in filteredSubjects" :key="subject.id" class="subject-card glass-card" :style="{ '--subject-color': subject.color || '#7972de' }">
        <div class="subject-card-top"><span class="subject-book"><v-icon icon="mdi-book-open-page-variant-outline" size="22" /></span><v-btn icon="mdi-pencil-outline" variant="text" size="small" :aria-label="`Editar ${subject.name}`" @click="startSubjectEdit(subject.id)" /></div>
        <h3>{{ subject.name }}</h3>
        <p class="subject-professor"><v-icon icon="mdi-account-outline" size="17" />{{ subject.professorName || 'Professor ainda não informado' }}</p>
        <div v-if="subject.professorEmail || subject.professorContact" class="subject-contacts">
          <span v-if="subject.professorEmail"><v-icon icon="mdi-email-outline" size="16" />{{ subject.professorEmail }}</span>
          <span v-if="subject.professorContact"><v-icon icon="mdi-phone-outline" size="16" />{{ subject.professorContact }}</span>
        </div>
        <footer><v-btn variant="text" color="primary" size="small" @click="startSubjectEdit(subject.id)">Editar detalhes</v-btn><v-btn icon="mdi-trash-can-outline" variant="text" size="small" :aria-label="`Remover ${subject.name}`" @click="deleteTarget = subject" /></footer>
      </article>
    </div>

    <v-dialog v-model="formOpen" max-width="580" scrollable>
      <v-card class="subject-dialog">
        <v-card-title class="subject-dialog-heading"><div><span class="subjects-eyebrow">DISCIPLINAS</span><h2>{{ subjectEditId ? 'Editar disciplina' : 'Nova disciplina' }}</h2></div><v-btn icon="mdi-close" variant="text" size="small" aria-label="Fechar formulário" @click="formOpen = false" /></v-card-title>
        <v-card-text>
          <p class="subject-form-intro">Dê um nome à disciplina e escolha uma cor para encontrá-la facilmente.</p>
          <v-form id="subject-form" @submit.prevent="submitSubject">
            <v-text-field v-model.trim="subjectForm.name" label="Nome da disciplina" placeholder="Ex.: Língua Portuguesa I" variant="outlined" :error-messages="nameError" autofocus required @update:model-value="nameError = ''" />
            <fieldset class="subject-colors"><legend>Cor de identificação</legend><div class="subject-swatches"><button v-for="color in colors" :key="color.value" type="button" :style="{ background: color.value }" :aria-label="color.label" :aria-pressed="subjectForm.color === color.value" @click="subjectForm.color = color.value"><v-icon v-if="subjectForm.color === color.value" icon="mdi-check" size="20" /></button><label class="subject-custom-color" title="Escolher outra cor"><v-icon icon="mdi-palette-outline" size="21" /><input v-model="subjectForm.color" type="color" aria-label="Escolher outra cor" /></label></div></fieldset>
            <div class="subject-preview" :style="{ borderLeftColor: subjectForm.color }"><v-icon icon="mdi-book-outline" size="19" :style="{ color: subjectForm.color }" /><span>{{ subjectForm.name || 'Sua disciplina' }}</span><small>Prévia</small></div>
            <details class="subject-optional" :open="subjectEditId ? true : undefined"><summary>Professor e contato <span>Opcional</span></summary><div class="subject-optional-fields"><v-text-field v-model.trim="subjectForm.professorName" label="Nome do professor ou professora" variant="outlined" hide-details /><v-text-field v-model.trim="subjectForm.professorEmail" label="E-mail do professor" type="email" variant="outlined" hide-details /><v-text-field v-model.trim="subjectForm.professorContact" label="Outro contato" placeholder="Telefone, ramal ou outra informação" variant="outlined" hide-details /></div></details>
          </v-form>
        </v-card-text>
        <v-card-actions class="subject-dialog-actions"><v-btn variant="text" @click="formOpen = false">Cancelar</v-btn><v-btn type="submit" form="subject-form" variant="flat" color="primary">{{ subjectEditId ? 'Salvar alterações' : 'Criar disciplina' }}</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog :model-value="!!deleteTarget" max-width="430" @update:model-value="deleteTarget = null">
      <v-card class="pa-5"><v-card-title class="pa-0">Remover disciplina?</v-card-title><v-card-text class="px-0">Você vai remover “{{ deleteTarget?.name }}”. Suas anotações e trabalhos serão preservados.</v-card-text><v-card-actions><v-btn @click="deleteTarget = null">Cancelar</v-btn><v-btn color="error" variant="tonal" @click="confirmRemove">Remover disciplina</v-btn></v-card-actions></v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { createSubjectForm } from '../utils/helpers';
import { useDebouncedPersist } from '../composables/useDebouncedPersist';
import { useSyncStore } from '../stores/useSyncStore';
const syncStore = useSyncStore();
const subjectsStore = useSubjectsStore();
const persist = useDebouncedPersist(500);
const subjectForm = ref(createSubjectForm());
const subjectEditId = ref('');
const formOpen = ref(false);
const nameError = ref('');
const search = ref('');
const deleteTarget = ref(null);
const colors = [
  { value: '#7972de', label: 'Violeta' }, { value: '#477fcd', label: 'Azul' },
  { value: '#368c80', label: 'Verde' }, { value: '#bd8b3b', label: 'Dourado' },
  { value: '#cf7556', label: 'Terracota' }, { value: '#bb6e9a', label: 'Rosa' }
];
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const filteredSubjects = computed(() => subjectsStore.subjects.filter(subject => normalize(`${subject.name} ${subject.professorName || ''}`).includes(normalize(search.value).trim())));
const openNewSubject = () => {
  subjectForm.value = createSubjectForm({ color: colors[subjectsStore.subjects.length % colors.length].value });
  subjectEditId.value = '';
  nameError.value = '';
  formOpen.value = true;
};
const submitSubject = () => {
  if (!subjectForm.value.name?.trim()) { nameError.value = 'Informe o nome da disciplina.'; return; }
  if (subjectsStore.addSubject(subjectForm.value, subjectEditId.value)) {
    formOpen.value = false;
    persist();
  }
};
const startSubjectEdit = id => {
  const subject = subjectsStore.subjects.find(item => item.id === id);
  if (!subject) return;
  subjectEditId.value = id;
  subjectForm.value = createSubjectForm(subject);
  nameError.value = '';
  formOpen.value = true;
};
const confirmRemove = () => {
  if (!deleteTarget.value) return;
  syncStore.removeSubject(deleteTarget.value.id);
  persist();
  deleteTarget.value = null;
};
</script>

<style scoped>
.subjects-page { max-width:1280px; margin:0 auto; container-type:inline-size; }
.subjects-heading { display:flex; align-items:center; justify-content:space-between; gap:24px; margin:8px 0 30px; }
.subjects-eyebrow { display:block; font-size:10px; font-weight:700; letter-spacing:.15em; color:rgb(var(--gold-400)); margin-bottom:9px; }
.subjects-heading h2 { font-size:clamp(24px,3cqi,34px); line-height:1.25; letter-spacing:-.035em; }
.subjects-heading p,.subject-form-intro { font-size:13px; line-height:1.7; opacity:.65; margin-top:10px; }
.subjects-toolbar { display:flex; align-items:center; gap:20px; margin-bottom:24px; }
.subjects-toolbar .v-input { max-width:420px; }
.subjects-toolbar > span { font-size:12px; opacity:.6; margin-left:auto; white-space:nowrap; }
.subjects-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
.subject-card { padding:22px; display:flex; flex-direction:column; border-top:3px solid var(--subject-color); }
.subject-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
.subject-book { display:grid; place-items:center; width:42px; height:42px; border-radius:12px; color:var(--subject-color); background:color-mix(in srgb,var(--subject-color) 12%,transparent); }
.subject-card h3 { font-size:16px; line-height:1.55; overflow-wrap:anywhere; margin-bottom:12px; }
.subject-professor { display:flex; align-items:start; gap:8px; font-size:12px; opacity:.65; line-height:1.6; }
.subject-professor .v-icon { margin-top:2px; flex-shrink:0; }
.subject-contacts { display:grid; gap:9px; padding-top:16px; font-size:12px; opacity:.65; }
.subject-contacts span { display:flex; align-items:center; gap:8px; overflow-wrap:anywhere; }
.subject-card footer { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:auto; padding-top:22px; }
.subject-card footer .v-btn:first-child { margin-left:-10px; }
.subjects-empty { padding:55px 24px; text-align:center; }
.subjects-empty h3 { font-size:20px; margin:18px 0 8px; }
.subjects-empty p { opacity:.65; font-size:13px; margin-bottom:24px; }
.subjects-no-results { padding:35px 0; opacity:.65; }
.subject-dialog { border-radius:20px !important; background:var(--surface) !important; color:var(--app-text) !important; }
.subject-dialog-heading { display:flex; justify-content:space-between; align-items:center; padding:26px 28px 8px; }
.subject-dialog-heading h2 { font-size:24px; line-height:1.3; }
.subject-dialog :deep(.v-card-text) { padding:12px 28px 24px; }
.subject-form-intro { margin:0 0 24px; }
.subject-colors { border:0; padding:0; margin:2px 0 20px; }
.subject-colors legend { font-size:12px; margin-bottom:12px; }
.subject-swatches { display:flex; flex-wrap:wrap; gap:10px; }
.subject-swatches button,.subject-custom-color { width:36px; height:36px; border-radius:50%; display:grid; place-items:center; cursor:pointer; color:white; }
.subject-swatches button[aria-pressed=true] { outline:2px solid var(--app-text); outline-offset:3px; }
.subject-swatches button:focus-visible { outline:3px solid var(--app-text); outline-offset:3px; }
.subject-custom-color { position:relative; color:var(--app-text); border:1px solid var(--surface-border); overflow:hidden; }
.subject-custom-color input { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
.subject-custom-color:focus-within { outline:2px solid var(--app-text); outline-offset:3px; }
.subject-preview { display:flex; align-items:center; gap:10px; border:1px solid var(--surface-border); border-left:4px solid; border-radius:9px; padding:14px; font-size:13px; overflow-wrap:anywhere; }
.subject-preview small { margin-left:auto; opacity:.45; font-size:10px; }
.subject-optional { margin-top:24px; border-top:1px solid var(--surface-border); padding-top:20px; }
.subject-optional summary { cursor:pointer; font-size:13px; font-weight:600; }
.subject-optional summary span { font-size:11px; font-weight:400; opacity:.55; margin-left:8px; }
.subject-optional-fields { display:grid; gap:18px; padding-top:22px; }
.subject-dialog-actions { padding:16px 28px 24px; gap:8px; border-top:1px solid var(--surface-border); }
@container (max-width:950px) { .subjects-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@container (max-width:580px) { .subjects-grid { grid-template-columns:1fr; } .subjects-heading { align-items:start; flex-direction:column; } .subjects-toolbar { align-items:stretch; flex-direction:column; gap:12px; } .subjects-toolbar .v-input { max-width:none; } }
</style>
