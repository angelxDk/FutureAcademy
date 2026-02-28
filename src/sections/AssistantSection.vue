<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">IA Acadêmica</h2>
      <p class="text-sm text-medium-emphasis mb-5">Faça perguntas e receba respostas inteligentes</p>
      <v-form @submit.prevent="askAssistant" class="grid gap-4">
        <v-textarea
          v-model.trim="assistant.question"
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
          <p v-for="(line, idx) in assistant.answerLines" :key="`answer-${idx}`" class="mb-2 text-sm leading-relaxed">{{ line }}</p>
        </div>
      </v-col>
      <v-col cols="12" lg="5">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-semibold text-primary mb-3 uppercase tracking-wider text-xs">Fontes oficiais indexadas</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="source in officialSources"
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
import { ref } from 'vue';
import { useAppStore } from '../stores/useAppStore';
import { OFFICIAL_SOURCES } from '../utils/constants';

const appStore = useAppStore();

const assistant = ref({
  question: '',
  answerLines: []
});

const officialSources = ref(OFFICIAL_SOURCES);

const assistantSourceMatch = (question) => {
  const text = question.toLowerCase();
  const picks = new Set();

  const rules = [
    { keywords: ['bolsa', 'mestrado', 'doutorado', 'capes'], source: 'CAPES' },
    { keywords: ['artigo', 'periódico', 'revista científica'], source: 'SciELO' },
    { keywords: ['tese', 'dissertação'], source: 'BDTD' },
    { keywords: ['graduação', 'currículo', 'diretriz', 'mec'], source: 'MEC' },
    { keywords: ['programa', 'avaliação'], source: 'Plataforma Sucupira (CAPES)' }
  ];

  rules.forEach((rule) => {
    if (rule.keywords.some((word) => text.includes(word))) {
      picks.add(rule.source);
    }
  });

  if (!picks.size) {
    picks.add('MEC (Ministério da Educação)');
    picks.add('SciELO');
  }

  return OFFICIAL_SOURCES.filter((source) => picks.has(source.name));
};

const askAssistant = () => {
  const question = assistant.value.question;
  if (!question) return;

  const text = question.toLowerCase();
  const sources = assistantSourceMatch(text);
  const lines = [];

  lines.push('Plano sugerido:');

  if (text.includes('prova')) {
    lines.push('1) Divida o conteúdo em blocos pequenos e revise com repetição espaçada.');
    lines.push('2) Monte um roteiro de revisão por semana e reserve sessões de simulado.');
  } else if (text.includes('trabalho') || text.includes('artigo')) {
    lines.push('1) Defina objetivo, pergunta central e critérios de fonte antes de escrever.');
    lines.push('2) Use estrutura acadêmica: introdução, desenvolvimento, conclusão e referências.');
  } else if (text.includes('anota') || text.includes('resumo')) {
    lines.push('1) Organize notas por tema, conceito-chave e evidências.');
    lines.push('2) Conecte cada nota a uma fonte confiável para revisão futura.');
  } else {
    lines.push('1) Defina meta semanal com entregáveis objetivos e tempo estimado.');
    lines.push('2) Use pomodoro para execução e revise progresso no fim de cada dia.');
  }

  lines.push('');
  lines.push('Fontes oficiais recomendadas para consulta:');
  sources.forEach((source) => lines.push(`- ${source.name}: ${source.url}`));
  lines.push('');
  lines.push('Se precisar, peça um plano diário detalhado com base na sua matéria e data de prova.');

  assistant.value.answerLines = lines;
  appStore.showToast('Resposta gerada com base em fontes oficiais indexadas.');
};
</script>
