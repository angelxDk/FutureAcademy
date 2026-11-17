<template>
  <section class="glass-card p-6">
    <h2 class="text-xl font-bold mb-2">Seu plano · {{ billing?.plan === 'pro' ? 'Pro' : 'Gratuito' }}</h2>
    <p class="mb-3">O plano gratuito inclui organização acadêmica, caderno, mesa de estudo, grupos e IA local. O Pro acrescenta o tutor na nuvem, com até 20 solicitações por dia (UTC), sem download de modelo.</p>
    <p v-if="billing?.price" class="mb-3"><strong>{{ priceLabel }}</strong> · renovação automática. Cancele pelo portal da assinatura.</p>
    <p v-if="billing?.cancelAtPeriodEnd" class="mb-3">Cancelamento agendado. O acesso Pro permanece até {{ new Date(billing.validUntil).toLocaleDateString('pt-BR') }}.</p>
    <p v-if="error" role="alert" class="mb-3">{{ error }}</p>
    <p v-if="billing && !billing.configured" class="mb-3">A contratação do Pro ainda não está disponível. Você pode continuar usando os recursos gratuitos.</p>
    <div class="d-flex flex-wrap ga-3"><v-btn v-if="billing?.canManage" :disabled="busy" @click="open('portal')">Gerenciar ou cancelar assinatura</v-btn><v-btn v-if="billing?.configured && billing.plan !== 'pro'" color="primary" :loading="busy" :disabled="busy" @click="open(billing.plan === 'pro' ? 'portal' : 'checkout')">{{ billing.plan === 'pro' ? 'Gerenciar ou cancelar assinatura' : 'Assinar Pro' }}</v-btn><v-btn :disabled="busy" @click="refresh">Atualizar situação</v-btn></div>
  </section>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '../services/api';
const billing = ref(null), busy = ref(false), error = ref('');
const priceLabel = computed(() => {
  const p = billing.value?.price; if (!p) return '';
  const period = { month: 'mês', year: 'ano', week: 'semana', day: 'dia' }[p.interval] || p.interval;
  return `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p.currency }).format(p.amount / 100)} a cada ${p.intervalCount} ${period}`;
});
async function request(action) {
  const response = await apiFetch('/api/billing', action ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) } : {});
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
}
async function refresh() { if (busy.value) return; busy.value = true; error.value = ''; try { await request('refresh'); billing.value = await request(); } catch (e) { error.value = e.message; if (!billing.value) try { billing.value = await request(); } catch {} } finally { busy.value = false; } }
async function open(action) { busy.value = true; error.value = ''; try { const data = await request(action); const url = new URL(data.url); if (url.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)) throw new Error('Endereço de pagamento inválido.'); window.location.assign(url.href); } catch (e) { error.value = e.message; } finally { busy.value = false; } }
onMounted(async () => { try { billing.value = await request(); if (new URLSearchParams(window.location.search).has('assinatura')) await refresh(); } catch (e) { error.value = e.message; } });
</script>
