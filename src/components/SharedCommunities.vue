<template>
  <section class="glass-card p-6">
    <h2 class="text-xl font-bold mb-2">Grupos compartilhados</h2>
    <p class="mb-4">Converse com participantes convidados. As mensagens são atualizadas a cada poucos segundos. Os registros pessoais continuam abaixo.</p>
    <p v-if="error" role="alert" class="mb-3">{{ error }}</p>
    <v-form class="d-flex flex-wrap ga-3 mb-4" @submit.prevent="create">
      <v-text-field v-model.trim="name" label="Nome do grupo" maxlength="80" hide-details required />
      <v-text-field v-model.trim="description" label="Descrição" maxlength="500" hide-details />
      <v-btn type="submit" :disabled="busy || !name" :loading="busy">Criar grupo</v-btn>
    </v-form>
    <v-form class="d-flex flex-wrap ga-3 mb-4" @submit.prevent="join">
      <v-text-field v-model.trim="token" label="Código de convite recebido" hide-details />
      <v-btn type="submit" :disabled="busy || !token">Aceitar convite</v-btn>
    </v-form>
    <p v-if="!groups.length && !error">Seus grupos compartilhados aparecerão aqui.</p>
    <div class="d-flex flex-wrap ga-2 mb-4"><v-btn v-for="group in groups" :key="group.id" :variant="selected === group.id ? 'flat' : 'outlined'" @click="selected = group.id">{{ group.name }}</v-btn></div>
    <template v-if="current">
      <h3>{{ current.name }}</h3><p>{{ current.description }} · {{ current.memberIds.length }} participantes</p>
      <template v-if="isOwner">
        <v-form class="d-flex flex-wrap ga-3 my-3" @submit.prevent="invite">
          <v-text-field v-model.trim="emails" label="Convidar e-mails separados por vírgula" hide-details /><v-btn type="submit" :disabled="busy || !emails">Gerar convite</v-btn>
        </v-form>
        <div v-if="invitation" class="my-3"><p>Envie este código aos e-mails convidados. Válido por sete dias:</p><code class="invitation-code">{{ invitation }}</code><v-btn size="small" @click="copyInvite">Copiar código</v-btn></div>
        <details class="my-3"><summary>Gerenciar participantes</summary><div v-for="id in current.memberIds" :key="id" class="d-flex align-center ga-2"><small>{{ id === auth.currentUser?.uid ? 'Você (administrador)' : id }}</small><v-btn v-if="id !== auth.currentUser?.uid" size="small" :disabled="busy" @click="mutate('removeMember', { memberId: id })">Remover</v-btn></div></details>
      </template>
      <div class="shared-chat" role="log" aria-label="Mensagens do grupo" aria-live="polite">
        <article v-for="message in messages" :key="message.id" class="mb-4"><strong>{{ message.authorName }}</strong> <small>{{ new Date(message.createdAt).toLocaleString('pt-BR') }}</small><p class="message-text">{{ message.text }}</p><v-btn v-if="isOwner" size="x-small" variant="text" :disabled="busy" @click="mutate('removeMessage', { messageId: message.id })">Excluir mensagem</v-btn></article>
        <p v-if="!messages.length">Comece a conversa. As últimas 100 mensagens são exibidas.</p>
      </div>
      <v-form class="mt-3" @submit.prevent="send"><v-textarea v-model="text" label="Mensagem para os participantes" maxlength="4000" counter rows="2" /><v-btn type="submit" :disabled="busy || !text.trim()" :loading="busy">Enviar mensagem</v-btn></v-form>
      <details class="mt-4"><summary>Denunciar um problema</summary><v-textarea v-model.trim="report" label="Descreva o problema" maxlength="2000" rows="2" /><v-btn :disabled="busy || !report" @click="submitReport">Registrar denúncia</v-btn><p>O relato fica disponível para a equipe responsável pela plataforma.</p></details>
      <v-btn class="mt-4" color="error" variant="text" @click="confirmRemoval = true">{{ isOwner ? 'Excluir grupo' : 'Sair do grupo' }}</v-btn>
      <v-dialog v-model="confirmRemoval" max-width="460"><v-card :title="isOwner ? 'Excluir grupo e mensagens?' : 'Sair deste grupo?'" text="Você perderá o acesso a esta conversa."><v-card-actions><v-btn @click="confirmRemoval = false">Cancelar</v-btn><v-btn color="error" :disabled="busy" @click="remove">Confirmar</v-btn></v-card-actions></v-card></v-dialog>
    </template>
  </section>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { subscribeCommunity } from '../services/communitySubscriptions';
import { auth } from '../auth';
import { supabase } from '../services/supabase';
import { apiFetch } from '../services/api';
const groups = ref([]), messages = ref([]), selected = ref(''), error = ref(''), busy = ref(false);
const name = ref(''), description = ref(''), token = ref(''), text = ref(''), emails = ref(''), invitation = ref(''), report = ref(''), confirmRemoval = ref(false);
const current = computed(() => groups.value.find(g => g.id === selected.value));
const isOwner = computed(() => current.value?.ownerId === auth.currentUser?.uid);
let stopGroups, stopMessages;
async function call(action, payload = {}) {
  const response = await apiFetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: selected.value, ...payload }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
}
async function mutate(action, payload) {
  if (busy.value) return null;
  busy.value = true; error.value = '';
  try { return await call(action, payload); } catch (e) { error.value = e.message; return null; } finally { busy.value = false; }
}
async function create() { const result = await mutate('create', { name: name.value, description: description.value }); if (result) { selected.value = result.id; name.value = ''; description.value = ''; } }
async function join() { const result = await mutate('join', { token: token.value }); if (result) { selected.value = result.id; token.value = ''; } }
async function send() { if (await mutate('send', { text: text.value })) text.value = ''; }
async function invite() { const result = await mutate('invite', { emails: emails.value.split(',').map(e => e.trim()).filter(Boolean) }); if (result) invitation.value = result.token; }
async function copyInvite() { try { await navigator.clipboard.writeText(invitation.value); } catch { error.value = 'Selecione e copie o código acima.'; } }
async function submitReport() { if (await mutate('report', { text: report.value })) { report.value = ''; error.value = 'Denúncia registrada para análise.'; } }
async function remove() { if (await mutate(isOwner.value ? 'delete' : 'leave')) { selected.value = ''; confirmRemoval.value = false; } }
watch(selected, id => {
  stopMessages?.(); messages.value = []; invitation.value = '';
  if (id && supabase) stopMessages = subscribeCommunity(id, data => { messages.value = data; }, () => { error.value = 'Não foi possível acompanhar as mensagens. Confira sua conexão ou acesso ao grupo.'; });
});
onMounted(() => {
  if (!supabase || !auth.currentUser) { error.value = 'Entre na sua conta com sincronização disponível para usar grupos compartilhados.'; return; }
  stopGroups = subscribeCommunity(null, data => { groups.value = data; if (!groups.value.some(g => g.id === selected.value)) selected.value = groups.value[0]?.id || ''; }, () => { error.value = 'Os grupos compartilhados estão indisponíveis. Verifique a conexão e a configuração do serviço.'; });
});
onUnmounted(() => { stopGroups?.(); stopMessages?.(); });
</script>
<style scoped>
.shared-chat { max-height:400px; overflow:auto; border:1px solid var(--app-border); border-radius:12px; padding:16px; margin-top:16px; }
.message-text { white-space:pre-wrap; overflow-wrap:anywhere; }
.invitation-code { display:block; overflow-wrap:anywhere; padding:12px; }
summary { cursor:pointer; padding:8px 0; }
</style>
