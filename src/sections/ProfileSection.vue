<template>
  <section class="grid gap-6">
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
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/useUserStore';
import { useAppStore } from '../stores/useAppStore';
import { DEFAULT_AVATAR } from '../utils/constants';
import { useDebouncedPersist } from '../composables/useDebouncedPersist';

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
