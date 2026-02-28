<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Comunidades de estudo</h2>
      <p class="text-sm text-medium-emphasis mb-5">Chat com clima, Spotify</p>

      <v-form @submit.prevent="handleAddCommunity">
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="communityForm.name" label="Nome" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="communityForm.description" label="Descrição" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="communityForm.emails" label="E-mails (vírgula)" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12">
            <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">Criar comunidade</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <div class="glass-card p-6">
      <h3 class="text-base font-semibold text-primary mb-1">Integrações</h3>
      <p class="text-sm text-medium-emphasis mb-4">
        As chaves ficam no backend (<code>.env</code>) e não são expostas no navegador.
      </p>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            v-model.trim="userStore.settings.integrations.openAiModel"
            label="Modelo OpenAI (opcional)"
            variant="outlined"
            density="comfortable"
            bg-color="transparent"
            color="primary"
          />
        </v-col>
        <v-col cols="12" md="8">
          <v-alert type="info" variant="tonal" density="comfortable">
            Configure <code>OPENAI_API_KEY</code>, <code>SPOTIFY_CLIENT_ID</code>, <code>SPOTIFY_CLIENT_SECRET</code> e
            <code>EXCHANGERATE_API_KEY</code> no arquivo <code>.env</code>.
          </v-alert>
        </v-col>
      </v-row>
    </div>

    <v-row>
      <v-col cols="12" lg="4">
        <div class="glass-card p-2" style="height: 100%">
          <v-list density="compact" bg-color="transparent">
            <v-list-subheader class="text-xs font-semibold uppercase tracking-wider">Comunidades</v-list-subheader>
            <v-list-item
              v-for="community in communitiesStore.orderedCommunities"
              :key="community.id"
              :title="community.name"
              :subtitle="community.description"
              :active="chatOps.communityChat.selectedCommunityId === community.id"
              rounded="lg"
              color="primary"
              @click="chatOps.selectCommunity(community.id)"
            >
              <template #append>
                <v-chip size="x-small" color="secondary" variant="flat">{{ community.members.length }}</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-col>

      <v-col cols="12" lg="8">
        <div class="glass-card p-5" style="min-height: 520px">
          <template v-if="chatOps.selectedCommunity.value">
            <div class="d-flex justify-space-between flex-wrap ga-3 mb-4">
              <div>
                <h3 class="text-lg font-bold text-high-emphasis">{{ chatOps.selectedCommunity.value.name }}</h3>
                <p class="text-sm text-medium-emphasis mb-0">{{ chatOps.selectedCommunity.value.description }}</p>
              </div>
              <div class="d-flex flex-wrap ga-2">
                <v-btn size="small" color="secondary" variant="outlined" @click="chatOps.inviteCommunity(chatOps.selectedCommunity.value)">Convidar</v-btn>
                <v-btn size="small" color="error" variant="outlined" @click="chatOps.removeCommunity(chatOps.selectedCommunity.value.id)">Remover</v-btn>
              </div>
            </div>

            <div class="d-flex flex-wrap ga-2 mb-4">
              <v-btn size="small" variant="outlined" color="primary" @click="chatOps.prefillCommunityCommand('/tempo São Paulo')">Tempo</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="chatOps.prefillCommunityCommand('/spotify lo-fi study')">Spotify</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="chatOps.prefillCommunityCommand('/cambio 100 USD BRL')">Câmbio</v-btn>
              <v-btn size="small" variant="outlined" color="primary" @click="chatOps.prefillCommunityCommand('/ia sugira um plano semanal para estudo em grupo')">OpenAI</v-btn>
              <v-btn size="small" variant="outlined" color="secondary" @click="chatOps.prefillCommunityCommand('/ajuda')">Ajuda</v-btn>
            </div>

            <div id="community-messages-log" class="community-messages-log overflow-y-auto rounded-xl mb-4">
              <div
                v-for="message in chatOps.selectedCommunityMessages.value"
                :key="message.id"
                class="community-message pa-2 mb-2 rounded-lg"
                :class="{
                  'msg-user': message.role === 'user',
                  'msg-assistant': message.role === 'assistant',
                  'msg-system': message.role !== 'user' && message.role !== 'assistant'
                }"
              >
                <div class="d-flex justify-space-between text-caption mb-1">
                  <strong>{{ chatOps.communityRoleLabel(message.role) }}</strong>
                  <span class="text-medium-emphasis">{{ chatOps.formatDateTime(message.createdAt) }}</span>
                </div>
                <p class="mb-0 whitespace-pre-wrap text-sm">{{ message.text }}</p>
              </div>
            </div>

            <v-form @submit.prevent="chatOps.sendCommunityMessage" class="grid gap-3">
              <v-textarea
                v-model.trim="chatOps.communityChat.message"
                rows="3"
                label="Mensagem"
                variant="outlined"
                bg-color="transparent"
                color="primary"
                placeholder="/tempo Recife | /spotify focus | /cambio 100 USD BRL | /ia sua pergunta"
                required
              />
              <div class="d-flex flex-wrap align-center ga-3">
                <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold" :loading="chatOps.communityChat.busy" :disabled="chatOps.communityChat.busy">Enviar</v-btn>
                <span class="text-caption text-medium-emphasis">Sem comando: envia para OpenAI se o backend estiver configurado.</span>
              </div>
            </v-form>
          </template>

          <template v-else>
            <div class="d-flex align-center justify-center" style="min-height: 400px">
              <p class="text-medium-emphasis">Selecione uma comunidade para conversar.</p>
            </div>
          </template>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useUserStore } from '../stores/useUserStore';
import { useCommunitiesStore } from '../stores/useCommunitiesStore';
import { useCommunityChat } from '../composables/useCommunityChat';

const userStore = useUserStore();
const communitiesStore = useCommunitiesStore();

const communityForm = ref({
  name: '',
  description: '',
  emails: ''
});

const chatOps = useCommunityChat();

const handleAddCommunity = () => {
  chatOps.addCommunity(communityForm.value);
  communityForm.value = { name: '', description: '', emails: '' };
};

onMounted(() => {
  chatOps.scrollCommunityMessagesToBottom();
});
</script>

<style scoped>
.community-messages-log {
  height: 260px;
  padding: 12px;
  background: rgba(var(--dark-900), 0.4);
  border: 1px solid rgba(var(--dark-600), 0.3);
}

.msg-user {
  background: rgba(var(--gold-500), 0.1) !important;
}

.msg-assistant {
  background: rgba(var(--gold-400), 0.12) !important;
}

.msg-system {
  background: rgba(var(--dark-700), 0.35) !important;
}
</style>
