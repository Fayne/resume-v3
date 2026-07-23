<script setup>
import { useI18n } from 'vue-i18n'
import LanguageSwitch from './components/LanguageSwitch.vue'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-ink/10">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <router-link to="/" class="font-serif text-lg">{{ t('nav.home') }}</router-link>
        <div class="flex items-center gap-4">
          <router-link to="/admin" class="text-sm text-ink/60 hover:text-ink">{{ t('nav.admin') }}</router-link>
          <LanguageSwitch />
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-6 py-10">
      <router-view />
    </main>
  </div>
</template>
