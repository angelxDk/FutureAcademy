<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">IA Acadêmica</h2>
      <p class="text-sm text-medium-emphasis mb-5">Faça perguntas e receba respostas inteligentes</p>
      <v-form @submit.prevent="ctx.askAssistant" class="grid gap-4">
        <v-textarea
          v-model.trim="ctx.assistant.question"
          rows="4"
          label="Pergunta"
          variant="outlined"
          bg-color="transparent"
          color="primary"
          placeholder="Ex: Como montar plano de revisão para prova de literatura?"
          required
        />
        <div>
          <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">Consultar IA</v-btn>
        </div>
      </v-form>
    </div>

    <v-row>
      <v-col cols="12" lg="7">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-semibold text-primary mb-3 uppercase tracking-wider text-xs">Resposta</h3>
          <p v-for="(line, idx) in ctx.assistant.answerLines" :key="`answer-${idx}`" class="mb-2 text-sm leading-relaxed">{{ line }}</p>
        </div>
      </v-col>
      <v-col cols="12" lg="5">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-semibold text-primary mb-3 uppercase tracking-wider text-xs">Fontes oficiais indexadas</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="source in ctx.officialSources"
              :key="source.url"
              :href="source.url"
              target="_blank"
              rel="noreferrer noopener"
              :title="source.name"
              :subtitle="source.scope"
              rounded="lg"
            />
          </v-list>
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
