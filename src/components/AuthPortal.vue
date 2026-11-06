<template>
  <v-theme-provider theme="dark">
    <div class="academy-entrance">
      <div class="entrance-topline"><a class="entrance-wordmark" href="/" aria-label="Future Academy, início"><img src="/academy-emblem-transparent.png" alt="" width="64" height="48" /><span>FUTURE <b>ACADEMY</b><small>FICHÁRIO ACADÊMICO</small></span></a><router-link v-if="signedIn" class="entrance-return" to="/">Voltar ao meu fichário <span aria-hidden="true">↗</span></router-link></div>
      <div class="entrance-layout">
        <section class="agora-scene" aria-label="Apresentação da Future Academy">
          <img class="agora-scene__art" src="../assets/agora-futura.png" alt="Ágora de mármore com colunas gregas e órbitas douradas sob um céu noturno." fetchpriority="high" decoding="async" />
          <HolographicGlobe />
          <div class="agora-scene__shade" aria-hidden="true" />
          <div class="agora-meteors" aria-hidden="true"><span v-for="star in 5" :key="star" class="agora-meteor" :style="{ '--star': star }" /></div>
          <div class="entrance-presentation"><p class="presentation-eyebrow">ESTUDO · ORGANIZAÇÃO · EVOLUÇÃO</p><h2>Estudo com propósito<br>para o seu futuro.</h2><p class="presentation-description">Organize sua rotina, reúna seus materiais e encontre espaço para aprender no seu ritmo.</p><div class="presentation-tools"><span><v-icon icon="mdi-calendar-month-outline" />Plano de estudos</span><span><v-icon icon="mdi-notebook-outline" />Caderno</span><span><v-icon icon="mdi-auto-fix" />IA de estudo</span></div></div>
          <div class="presentation-benefits"><div><v-icon icon="mdi-bullseye-arrow" /><span><strong>Mais foco</strong><small>Sua rotina com clareza.</small></span></div><div><v-icon icon="mdi-book-open-page-variant-outline" /><span><strong>Suas ideias juntas</strong><small>Um lugar para cada descoberta.</small></span></div><div><v-icon icon="mdi-school-outline" /><span><strong>Seu próximo passo</strong><small>Aprenda no seu ritmo.</small></span></div></div>
        </section>
        <section class="entrance-form-area" aria-labelledby="entrance-form-title">
          <div class="entrance-form-wrap">
            <span class="entrance-kicker"><v-icon icon="mdi-school-outline" size="19" />Seu espaço de estudo</span>
            <h1 id="entrance-form-title">{{ mode === 'login' ? 'Seu ambiente de aprendizado.' : 'Comece seu próximo capítulo.' }}</h1>
            <p class="entrance-form-description">{{ mode === 'login' ? 'Acesse seu fichário e continue de onde parou.' : 'Crie sua conta para organizar aulas, anotações e trabalhos.' }}</p>
            <div class="entrance-social"><v-btn class="entrance-google" variant="outlined" block height="48" :disabled="busy" @click="$emit('google')"><v-icon icon="mdi-google" size="18" class="mr-3" />Continuar com Google</v-btn><v-btn class="entrance-facebook" variant="outlined" block height="48" :disabled="busy" @click="$emit('facebook')"><v-icon icon="mdi-facebook" size="17" class="mr-2" />Continuar com Facebook</v-btn></div>
            <div class="entrance-divider"><span />ou use seu e-mail<span /></div>
            <v-form ref="formRef" @submit.prevent="submit" class="entrance-form" :disabled="busy">
              <v-text-field v-if="mode === 'register'" v-model.trim="name" label="Seu nome" autocomplete="name" :rules="[v => !!String(v || '').trim() || 'Como podemos chamar você?']" variant="outlined" density="comfortable" color="#d5b877" hide-details="auto" />
              <v-text-field v-model.trim="email" label="E-mail" prepend-inner-icon="mdi-email-outline" type="email" autocomplete="email" :rules="emailRules" variant="outlined" density="comfortable" color="#d5b877" hide-details="auto" placeholder="voce@exemplo.com" />
              <v-text-field v-model="password" label="Senha" prepend-inner-icon="mdi-lock-outline" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" :rules="passwordRules" :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" @click:append-inner="showPassword = !showPassword" variant="outlined" density="comfortable" color="#d5b877" hide-details="auto" />
              <v-text-field v-if="mode === 'register'" v-model="confirm" label="Confirme sua senha" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :rules="[v => v === password || 'As senhas precisam ser iguais.']" variant="outlined" density="comfortable" color="#d5b877" hide-details="auto" />
              <v-btn type="submit" class="entrance-submit" block height="50" variant="flat" :loading="busy" :disabled="busy" append-icon="mdi-arrow-right">{{ mode === 'login' ? 'Entrar' : 'Criar conta' }}</v-btn>
            </v-form>
            <p class="entrance-switch">{{ mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?' }} <button type="button" :disabled="busy" @click="toggleMode">{{ mode === 'login' ? 'Criar uma conta' : 'Entrar na minha conta' }}</button></p>

          </div>
        </section>
      </div>
      <footer class="entrance-footer">Future Academy · Seu fichário acadêmico</footer>
    </div>
  </v-theme-provider>
</template>
<script setup>
import { computed, ref } from 'vue';
import HolographicGlobe from './HolographicGlobe.vue';
defineProps({ signedIn: { type: Boolean, default: false }, busy: { type: Boolean, default: false } });
const emit = defineEmits(['google', 'facebook', 'submit']);
const mode = ref('login'), name = ref(''), email = ref(''), password = ref(''), confirm = ref(''), showPassword = ref(false), formRef = ref(null);
const emailRules = [v => !!String(v || '').trim() || 'Informe seu e-mail.', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') || 'Confira o endereço de e-mail.'];
const passwordRules = computed(() => [v => !!v || 'Informe sua senha.', v => mode.value !== 'register' || String(v || '').length >= 6 || 'Use pelo menos 6 caracteres.']);
async function submit() { const validation = await formRef.value?.validate(); if (!validation?.valid) return; emit('submit', { mode: mode.value, name: name.value, email: email.value, password: password.value, confirm: confirm.value }); }
function toggleMode() { mode.value = mode.value === 'login' ? 'register' : 'login'; confirm.value = ''; formRef.value?.resetValidation(); }
</script>
<style scoped>
.academy-entrance { --entrance-gold:#d9bd80; --entrance-soft:#aeb6bf; min-height:100dvh; background:#0e1620; color:#ede7d8; padding:28px 48px 20px; }
.entrance-topline { max-width:1440px; margin:0 auto 26px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
.entrance-wordmark { display:flex; align-items:center; gap:10px; color:inherit; text-decoration:none; }
.entrance-wordmark img { width:45px; height:52px; object-fit:contain; }
.entrance-wordmark > span { font-size:13px; letter-spacing:2.3px; }
.entrance-wordmark b { font-weight:800; }
.entrance-wordmark small { display:block; margin-top:6px; color:var(--entrance-soft); font-size:8px; letter-spacing:1.5px; }
.entrance-return { font-size:13px; color:var(--entrance-gold); text-decoration:none; }
.entrance-layout { max-width:1440px; min-height:calc(100dvh - 165px); margin:auto; display:grid; grid-template-columns:minmax(0,1.12fr) minmax(0,1fr); border:1px solid #d9bd8024; border-radius:20px; overflow:hidden; background:#121d28; }
.agora-scene { position:relative; overflow:hidden; min-height:660px; background:#142030; }
.agora-scene__art { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:50% 58%; }
.entrance-form-area { display:flex; align-items:center; justify-content:center; padding:48px; background:#121d28; }
.entrance-form-wrap { width:100%; max-width:380px; }
.entrance-kicker { display:block; font-size:10px; font-weight:600; letter-spacing:1.8px; color:var(--entrance-gold); margin-bottom:18px; }
.entrance-form-area h1 { font-size:32px; font-weight:600; letter-spacing:-1.2px; line-height:1.3; }
.entrance-form-description { margin:12px 0 32px; font-size:14px; line-height:1.7; color:var(--entrance-soft); }
.entrance-social { display:grid; gap:10px; }
.entrance-social .v-btn { font-size:13px; text-transform:none; letter-spacing:0; border-radius:10px; }
.entrance-google { background:#192632 !important; border-color:#75808c70 !important; color:#ede7d8 !important; }
.entrance-google:hover { border-color:var(--entrance-gold) !important; }
.entrance-facebook { color:var(--entrance-soft) !important; }
.entrance-divider { display:flex; align-items:center; gap:16px; margin:26px 0; font-size:11px; color:var(--entrance-soft); }
.entrance-divider span { height:1px; flex:1; background:#71808d38; }
.entrance-form { display:grid; gap:18px; }
.entrance-form :deep(.v-field) { border-radius:10px; background:#0f1822; }
.entrance-form :deep(.v-field__outline) { color:#83909d; }
.entrance-form :deep(.v-label),.entrance-form :deep(.v-field__input) { font-size:14px; }
.entrance-form :deep(.v-messages) { font-size:12px; line-height:1.5; }
.entrance-submit { margin-top:6px; border-radius:10px; background:var(--entrance-gold) !important; color:#222118 !important; font-size:14px; font-weight:700; text-transform:none; letter-spacing:0; }
.entrance-submit :deep(.v-btn__append) { margin-left:auto; }
.entrance-submit :deep(.v-btn__content) { flex:1; }
.entrance-switch { text-align:center; margin:28px 0 0; font-size:13px; color:var(--entrance-soft); line-height:1.8; }
.entrance-switch button { margin-left:6px; color:var(--entrance-gold); cursor:pointer; font-weight:600; }
.entrance-switch button:hover { text-decoration:underline; }
.entrance-switch button:disabled { opacity:.4; cursor:default; }
.entrance-switch button:focus-visible,.entrance-return:focus-visible,.entrance-wordmark:focus-visible { outline:2px solid var(--entrance-gold); outline-offset:5px; border-radius:4px; }
.entrance-footer { max-width:1440px; margin:18px auto 0; font-size:10px; color:#919aa5; text-align:right; }
@media(min-width:1700px) { .academy-entrance { padding-top:36px; } .entrance-layout { min-height:calc(100dvh - 180px); } }
@media(max-width:1050px) { .academy-entrance { padding:24px; } .entrance-layout { grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); } .entrance-form-area { padding:38px 30px; } }
@media(max-width:760px) { .academy-entrance { padding:20px; } .entrance-topline { margin-bottom:30px; } .entrance-layout { display:block; min-height:0; border:0; background:transparent; border-radius:0; } .agora-scene { display:none; } .entrance-form-area { padding:24px 0 36px; background:transparent; } .entrance-form-wrap { max-width:420px; } .entrance-form-area h1 { font-size:30px; } .entrance-footer { text-align:center; margin-top:14px; } .entrance-return { font-size:11px; } }
/* Immersive agora composition, with a distinct and readable sign-in panel. */
.academy-entrance { position:relative; padding:0; background:#091722; --entrance-gold:#efc76f; }
.entrance-topline { position:absolute; top:28px; left:5%; right:5%; z-index:2; max-width:none; margin:0; }
.entrance-wordmark small { letter-spacing:.6px; font-size:11px; text-transform:none; }
.entrance-wordmark img { width:48px; height:56px; }
.entrance-layout { max-width:none; min-height:100dvh; grid-template-columns:minmax(0,1.2fr) minmax(450px,.8fr); border:0; border-radius:0; background:#091722; overflow:visible; }
.agora-scene { min-height:900px; }
.agora-scene__art { object-position:48% 64%; }
.agora-scene__shade { position:absolute; inset:0; background:linear-gradient(180deg,#071523bd 0%,#07152375 35%,transparent 67%,#07152385 100%); }
.entrance-presentation { position:relative; z-index:1; padding:150px 8% 0; max-width:720px; }
.presentation-eyebrow { color:var(--entrance-gold); font-size:11px; letter-spacing:2.6px; font-weight:600; margin-bottom:20px; }
.entrance-presentation h2 { font-size:clamp(32px,3vw,48px); line-height:1.17; letter-spacing:-1.3px; color:#f6edda; font-weight:700; }
.presentation-description { max-width:420px; font-size:15px; line-height:1.7; margin-top:20px; color:#d1d6da; }
.presentation-tools { display:flex; flex-wrap:wrap; gap:12px; margin-top:25px; }
.presentation-tools > span { display:flex; align-items:center; gap:10px; padding:13px 16px; border:1px solid #ccd7dd40; border-radius:14px; background:#1a2b379c; backdrop-filter:blur(12px); font-size:12px; }
.presentation-tools .v-icon { color:var(--entrance-gold); font-size:24px; }
.presentation-benefits { position:absolute; bottom:34px; left:5%; right:5%; display:flex; justify-content:space-between; gap:16px; border:1px solid #c5d1d34d; border-radius:20px; background:#16222cc9; backdrop-filter:blur(20px); padding:24px; }
.presentation-benefits > div { display:flex; align-items:center; gap:12px; flex:1; }
.presentation-benefits > div + div { border-left:1px solid #e6c88440; padding-left:18px; }
.presentation-benefits .v-icon { color:var(--entrance-gold); font-size:27px; }
.presentation-benefits strong { display:block; font-size:12px; color:#f1eadc; }
.presentation-benefits small { display:block; font-size:10px; color:#c2c9cb; margin-top:5px; line-height:1.6; }
.entrance-form-area { margin:100px 30px 46px 24px; padding:46px 36px; border:1px solid #577c9445; border-radius:28px; background:linear-gradient(150deg,#132734c9,#0b1925f5); box-shadow:inset 0 1px 0 #ffffff05,0 24px 70px #0000001a; }
.entrance-form-wrap { max-width:420px; }
.entrance-kicker { width:fit-content; display:flex; align-items:center; gap:9px; padding:8px 13px; border:1px solid #e5b855b0; border-radius:24px; background:#d9b3680a; font-size:12px; letter-spacing:0; margin-bottom:23px; }
.entrance-form-area h1 { font-size:clamp(28px,2.4vw,37px); line-height:1.18; font-weight:650; letter-spacing:-1px; }
.entrance-form-description { font-size:14px; margin:16px 0 28px; color:#b9c4cb; }
.entrance-google,.entrance-facebook { border-color:#6e8a9c70 !important; background:#23344070 !important; color:#f2eee4 !important; }
.entrance-social { gap:12px; }
.entrance-form :deep(.v-field) { background:#0b192566; border-radius:12px; }
.entrance-form :deep(.v-field__prepend-inner) { color:#d9bd80; }
.entrance-form :deep(.v-field--focused) { box-shadow:0 0 0 3px #ecc26710,0 0 18px #ecc2670a; }
.entrance-submit { background:linear-gradient(115deg,#f6d68c,#d9a647) !important; border:1px solid #f2ce7b; height:54px !important; margin-top:12px; font-size:16px; }
.entrance-footer { display:none; }
@media(min-width:1700px) { .academy-entrance { padding:0; } .entrance-layout { min-height:100dvh; } .entrance-form-area { margin-top:100px; } }
@media(max-width:1100px) { .entrance-layout { grid-template-columns:minmax(0,1fr) minmax(400px,1fr); } .entrance-form-area { padding:32px 24px; margin-left:12px; margin-right:20px; } .entrance-presentation { padding-inline:7%; } .presentation-benefits { flex-direction:column; padding:18px; gap:15px; } .presentation-benefits > div + div { border:0; padding:0; } }
@media(max-width:760px) { .academy-entrance { padding:0 20px 24px; } .entrance-topline { position:relative; inset:auto; padding:22px 0; margin:0; } .entrance-layout { display:block; min-height:0; } .agora-scene { display:none; } .entrance-form-area { margin:12px 0 0; padding:30px 24px; border-radius:22px; } .entrance-form-area h1 { font-size:30px; } .entrance-form-description { margin-bottom:26px; } }
.agora-meteors { position:absolute; inset:0 0 35%; overflow:hidden; pointer-events:none; }
.agora-meteor { position:absolute; top:-5%; left:calc(20% + var(--star) * 14%); width:110px; height:1px; background:linear-gradient(90deg,transparent,#eccb8599,#fff0c3); border-radius:50%; opacity:0; transform:rotate(135deg); animation:agora-shoot 17s linear infinite; animation-delay:calc(var(--star) * 3.3s - 14s); }
.agora-meteor::after { content:''; position:absolute; right:-1px; top:-1px; width:3px; height:3px; border-radius:50%; background:#fff1c9; box-shadow:0 0 7px 2px #ecca8177; }
.agora-meteor:nth-child(2) { top:12%; width:85px; }
.agora-meteor:nth-child(3) { top:4%; width:130px; }
.agora-meteor:nth-child(4) { top:22%; width:70px; }
.agora-meteor:nth-child(5) { top:16%; width:100px; }
@keyframes agora-shoot { 0%,3% { opacity:0; transform:translate(0,0) rotate(135deg); } 4% { opacity:.8; } 11% { opacity:0; transform:translate(-290px,290px) rotate(135deg); } 100% { opacity:0; transform:translate(-290px,290px) rotate(135deg); } }
@media(prefers-reduced-motion:reduce) { .agora-meteor { display:none; animation:none; } }
</style>
