<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Matérias</h2>
      <p class="text-sm text-medium-emphasis mb-5">Gerencie suas disciplinas e professores</p>
      <v-form @submit.prevent="ctx.addSubject">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model.trim="ctx.subjectForm.name" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model.trim="ctx.subjectForm.professorName" label="Professor(a)" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model.trim="ctx.subjectForm.professorEmail" label="E-mail" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="ctx.subjectForm.professorContact" label="Contato" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="ctx.subjectForm.color" label="Cor" type="color" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12">
            <div class="flex flex-wrap gap-3">
              <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
                {{ ctx.subjectEditId ? 'Atualizar matéria' : 'Salvar matéria' }}
              </v-btn>
              <v-btn
                v-if="ctx.subjectEditId"
                color="secondary"
                variant="outlined"
                height="44"
                @click="ctx.cancelSubjectEdit"
              >
                Cancelar edição
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <v-row>
      <v-col v-for="subject in ctx.state.subjects" :key="subject.id" cols="12" sm="6" lg="4">
        <div class="glass-card p-5" style="height: 100%">
          <div class="flex justify-between items-start mb-3">
            <h3 class="text-base font-bold text-high-emphasis">{{ subject.name }}</h3>
            <span :style="{ backgroundColor: subject.color, width: '14px', height: '14px', borderRadius: '50%', flexShrink: '0', marginTop: '4px' }"></span>
          </div>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Prof.</span> {{ subject.professorName }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">E-mail</span> {{ subject.professorEmail || '---' }}</p>
          <p class="text-sm text-medium-emphasis mb-4"><span class="font-semibold text-high-emphasis">Contato</span> {{ subject.professorContact || '---' }}</p>
          <div class="flex flex-wrap gap-2">
            <v-btn size="small" color="primary" variant="outlined" @click="ctx.startSubjectEdit(subject.id)">Editar</v-btn>
            <v-btn size="small" color="error" variant="outlined" @click="ctx.removeSubject(subject.id)">Remover</v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
defineProps({
  ctx: {
    type: Object,
    required: true
  }
});
</script>
