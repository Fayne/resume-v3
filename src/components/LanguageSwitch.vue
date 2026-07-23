<script setup>
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'

const { locale } = useI18n()
</script>

<template>
  <div class="inline-flex rounded-full border border-ink/15 p-0.5 text-sm">
    <button
      class="rounded-full px-3 py-1 transition-colors"
      :class="locale === 'zh' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'"
      @click="setLocale('zh')"
    >
      中
    </button>
    <button
      class="rounded-full px-3 py-1 transition-colors"
      :class="locale === 'en' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'"
      @click="setLocale('en')"
    >
      EN
    </button>
  </div>
</template>
