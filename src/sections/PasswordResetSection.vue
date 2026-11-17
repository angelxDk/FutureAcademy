<template>
  <main class="reset-password glass-card p-6">
    <h1>Redefinir senha</h1>
    <p>Abra o link de recuperação recebido por e-mail neste navegador.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <v-form @submit.prevent="save">
      <template v-if="needsCode">
        <p>Informe seu e-mail e o código de recuperação recebido. Você pode usar esse código mesmo em outro navegador.</p>
        <v-text-field v-model.trim="email" type="email" label="E-mail da conta" autocomplete="email" />
        <v-text-field v-model.trim="code" label="Código de recuperação" inputmode="numeric" autocomplete="one-time-code" />
      </template>
      <v-text-field v-model="password" type="password" label="Nova senha" autocomplete="new-password" />
      <v-text-field v-model="confirmation" type="password" label="Confirme a nova senha" autocomplete="new-password" />
      <v-btn type="submit" :loading="busy" :disabled="busy">Salvar nova senha</v-btn>
    </v-form>
    <router-link to="/entrar">Voltar para entrar</router-link>
  </main>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { requireSupabase } from '../services/supabase';
const password = ref(''), confirmation = ref(''), busy = ref(false), error = ref('');
const router = useRouter();
const email = ref(''), code = ref(''), needsCode = ref(false);
onMounted(async () => { try { const { data } = await requireSupabase().auth.getSession(); needsCode.value = !data.session; } catch { needsCode.value = true; } });
async function save() {
  if (password.value.length < 10 || password.value !== confirmation.value) { error.value = 'Use pelo menos 10 caracteres e confira se as senhas coincidem.'; return; }
  busy.value = true; error.value = '';
  try {
    const client = requireSupabase();
    let { data: { session } } = await client.auth.getSession();
    if (!session && email.value && /^\d{6,10}$/.test(code.value)) {
      const result = await client.auth.verifyOtp({ email: email.value, token: code.value, type: 'recovery' });
      if (result.error) throw new Error('Código inválido ou expirado. Solicite uma nova recuperação.');
      session = result.data.session;
    }
    if (!session) throw new Error('O link expirou ou foi aberto em outro navegador. Solicite uma nova recuperação.');
    const { error: failed } = await client.auth.updateUser({ password: password.value });
    if (failed) throw failed;
    await client.auth.signOut({ scope: 'local' });
    await router.replace('/entrar?senha=atualizada');
  } catch (e) { error.value = e.message; }
  finally { busy.value = false; }
}
</script>
<style scoped>.reset-password { max-width:540px; margin:48px auto; } h1,p,form { margin-bottom:24px; }</style>
