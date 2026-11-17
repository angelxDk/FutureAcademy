<template>
  <section class="grid gap-6">
    <BillingPanel />
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Perfil</h2>
      <p class="text-sm text-medium-emphasis mb-6">Suas informações pessoais</p>
      <v-row>
        <v-col cols="12" lg="7">
          <v-form @submit.prevent="saveProfile">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model.trim="profileForm.name" label="Nome" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model.trim="profileForm.email" label="E-mail" type="email" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model.trim="profileForm.course" label="Curso" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
              </v-col>
              <v-col cols="12" md="6">
                <div class="photo-upload-wrapper">
                  <label class="text-xs text-medium-emphasis font-semibold uppercase tracking-wider mb-2 block">Foto de perfil</label>
                  <input class="photo-input" type="file" accept="image/*" @change="onPhotoChange" />
                </div>
              </v-col>
              <v-col cols="12">
                <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">Salvar perfil</v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-col>

        <v-col cols="12" lg="5" class="d-flex flex-column align-center justify-center ga-3">
          <v-avatar size="120" class="mb-1">
            <v-img :src="profileForm.photo || DEFAULT_AVATAR" alt="Foto de perfil" cover />
          </v-avatar>
          <div class="text-center">
            <h3 class="text-base font-bold text-high-emphasis">{{ profileForm.name || 'Seu nome' }}</h3>
            <p class="text-sm text-medium-emphasis mb-1">{{ profileForm.course || 'Seu curso' }}</p>
            <small class="text-medium-emphasis">{{ profileForm.email || 'seu-email@exemplo.com' }}</small>
          </div>
        </v-col>
      </v-row>
    </div>
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold mb-3">Conta e segurança</h2>
      <p class="mb-3">E-mail de acesso: {{ auth.currentUser?.email }}. O e-mail do perfil é apenas uma informação de contato.</p>
      <p v-if="!auth.currentUser?.emailVerified" class="mb-3">Seu e-mail ainda não foi verificado.</p>
      <div class="d-flex flex-wrap ga-3">
        <v-btn v-if="!auth.currentUser?.emailVerified" @click="authStore.verifyEmail()">Enviar verificação</v-btn>
        <v-btn @click="authStore.resetPassword(auth.currentUser?.email || '')">Redefinir senha</v-btn>
        <v-btn @click="exportAllData">Exportar todos os meus dados pessoais</v-btn>
        <v-btn @click="backupInput?.click()">Restaurar backup</v-btn>
        <input ref="backupInput" type="file" accept="application/json,.json" hidden @change="readBackup" />
        <v-btn color="error" variant="outlined" @click="deleteDialog = true">Excluir minha conta</v-btn>
      </div>
      <p class="mt-3"><router-link to="/privacidade">Privacidade</router-link> · <router-link to="/termos">Termos de uso</router-link></p>
    </div>
    <v-dialog v-model="restoreDialog" max-width="520"><v-card title="Restaurar cópia de segurança?" text="O backup substituirá seu fichário pessoal atual. Uma cópia do estado atual será baixada antes da restauração."><v-card-actions><v-btn @click="restoreDialog = false">Cancelar</v-btn><v-btn color="primary" @click="restoreBackup">Exportar atual e restaurar</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog v-model="deleteDialog" max-width="520">
      <v-card title="Excluir sua conta definitivamente">
        <v-card-text><p>Seus dados pessoais, mensagens compartilhadas e comunidades que você administra serão excluídos. Esta ação não pode ser desfeita. Exporte seus dados antes de continuar.</p><v-text-field v-model="deleteConfirmation" label="Digite EXCLUIR para confirmar" class="mt-4" /><p role="alert">{{ accountError }}</p></v-card-text>
        <v-card-actions><v-btn :disabled="deleting" @click="deleteDialog = false">Cancelar</v-btn><v-btn color="error" :loading="deleting" :disabled="deleteConfirmation !== 'EXCLUIR' || deleting" @click="removeAccount">Excluir definitivamente</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import BillingPanel from '../components/BillingPanel.vue';
import { ref, onMounted } from 'vue';
import { auth, signOut } from '../auth';
import { apiFetch } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStore } from '../stores/useSyncStore';
import { validateBackup } from '../utils/backup';
import { useUserStore } from '../stores/useUserStore';
import { useAppStore } from '../stores/useAppStore';
import { DEFAULT_AVATAR } from '../utils/constants';
import { useDebouncedPersist } from '../composables/useDebouncedPersist';

const authStore = useAuthStore(), sync = useSyncStore();
const deleteDialog = ref(false), deleteConfirmation = ref(''), deleting = ref(false), accountError = ref('');
const backupInput = ref(null), restoreDialog = ref(false), backup = ref(null);
async function readBackup(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try { if (file.size > 20 * 1024 * 1024) throw new Error('O backup deve ter até 20 MB.'); backup.value = validateBackup(JSON.parse(await file.text())); restoreDialog.value = true; }
  catch (error) { appStore.showToast(error.message); }
  event.target.value = '';
}
async function restoreBackup() {
  sync.exportBackup(); sync.hydrateStores(backup.value); sync.persistState(); restoreDialog.value = false;
  appStore.showToast('Backup restaurado neste dispositivo. Acompanhe o estado da sincronização.');
}
async function exportAllData() {
  try { const response = await apiFetch('/api/account'); const data = await response.json(); if (!response.ok) throw new Error(data.error); sync.exportBackup({ sharedAccountData: data }); }
  catch (error) { appStore.showToast(`Não foi possível exportar os dados compartilhados: ${error.message}. Use Exportar cópia na barra de sincronização para baixar somente o fichário local.`); }
}
async function removeAccount() {
  deleting.value = true; accountError.value = '';
  try {
    await sync.flushPersist();
    const response = await apiFetch('/api/account', { method: 'DELETE' });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    const uid = auth.currentUser.uid;
    localStorage.removeItem(`fa_state_${uid}`);
    await signOut(auth); sync.resetToDefault();
    window.location.replace('/entrar?conta=excluida');
  } catch (error) { accountError.value = error.message; }
  finally { deleting.value = false; }
}
const userStore = useUserStore();
const appStore = useAppStore();
const persist = useDebouncedPersist(500);

const profileForm = ref({
  name: '',
  email: '',
  course: '',
  photo: ''
});

onMounted(() => {
  profileForm.value = {
    name: userStore.profile?.name || '',
    email: userStore.profile?.email || '',
    course: userStore.profile?.course || '',
    photo: userStore.profile?.photo || ''
  };
});

const saveProfile = () => {
  if (!userStore.profile) {
    userStore.profile = {};
  }
  userStore.profile.name = profileForm.value.name;
  userStore.profile.email = profileForm.value.email;
  userStore.profile.course = profileForm.value.course;
  if(profileForm.value.photo) {
      userStore.profile.photo = profileForm.value.photo;
  }
    persist();
  appStore.showToast('Perfil atualizado.');
};

const onPhotoChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { appStore.showToast('Escolha uma imagem de até 5 MB.'); return; }

  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 200;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const compressed = canvas.toDataURL('image/jpeg', 0.82);
    
    profileForm.value.photo = compressed;
    if (!userStore.profile) {
        userStore.profile = {};
    }
    userStore.profile.photo = compressed;
    
      persist();
    appStore.showToast('Foto de perfil atualizada.');
  };
  img.onerror = () => { URL.revokeObjectURL(url); appStore.showToast('Não foi possível abrir essa imagem.'); };
  img.src = url;
};
</script>

<style scoped>
.photo-input {
  display: block;
  width: 100%;
  font-size: 0.875rem;
  color: var(--app-muted);
  padding: 6px 0;
}
</style>
