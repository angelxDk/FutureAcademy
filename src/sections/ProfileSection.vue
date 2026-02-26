<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Perfil</h2>
      <p class="text-sm text-medium-emphasis mb-6">Suas informações pessoais</p>
      <v-row>
        <v-col cols="12" lg="7">
          <v-form @submit.prevent="ctx.saveProfile">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model.trim="ctx.profileForm.name" label="Nome" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model.trim="ctx.profileForm.email" label="E-mail" type="email" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model.trim="ctx.profileForm.course" label="Curso" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
              </v-col>
              <v-col cols="12" md="6">
                <div class="photo-upload-wrapper">
                  <label class="text-xs text-medium-emphasis font-semibold uppercase tracking-wider mb-2 block">Foto de perfil</label>
                  <input class="photo-input" type="file" accept="image/*" @change="ctx.onPhotoChange" />
                </div>
              </v-col>
              <v-col cols="12">
                <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">Salvar perfil</v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-col>

        <v-col cols="12" lg="5" class="flex flex-col items-center justify-center gap-3">
          <v-avatar size="120" class="mb-1">
            <v-img :src="ctx.profileForm.photo || ctx.defaultAvatar" alt="Foto de perfil" cover />
          </v-avatar>
          <div class="text-center">
            <h3 class="text-base font-bold text-high-emphasis">{{ ctx.profileForm.name || 'Seu nome' }}</h3>
            <p class="text-sm text-medium-emphasis mb-1">{{ ctx.profileForm.course || 'Seu curso' }}</p>
            <small class="text-medium-emphasis">{{ ctx.profileForm.email || 'seu-email@exemplo.com' }}</small>
          </div>
        </v-col>
      </v-row>
    </div>
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

<style scoped>
.photo-input {
  display: block;
  width: 100%;
  font-size: 0.875rem;
  color: var(--app-muted);
  padding: 6px 0;
}
</style>
