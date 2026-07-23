<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import resume from '../data/resume.json'

const { t, locale } = useI18n()

// 双语字段形如 { zh: '...', en: '...' }，根据当前语言取值
function loc(field) {
  if (field && typeof field === 'object') return field[locale.value] || field.zh || ''
  return field || ''
}

const profile = computed(() => resume.profile)
</script>

<template>
  <article class="space-y-12">
    <section class="flex items-start gap-6">
      <img
        v-if="profile.avatar"
        :src="profile.avatar"
        :alt="loc(profile.name)"
        class="h-20 w-20 rounded-full object-cover"
      />
      <div>
        <h1 class="font-serif text-3xl">{{ loc(profile.name) }}</h1>
        <p class="mt-1 text-ink/70">{{ loc(profile.title) }} · {{ loc(profile.location) }}</p>
        <p class="mt-1 text-sm text-ink/50">{{ profile.email }} {{ profile.phone ? ' · ' + profile.phone : '' }}</p>
      </div>
    </section>

    <section v-if="profile.summary">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-ink/50">{{ t('section.summary') }}</h2>
      <p class="leading-relaxed text-ink/80">{{ loc(profile.summary) }}</p>
    </section>

    <section v-if="resume.experiences?.length">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-ink/50">{{ t('section.experience') }}</h2>
      <div class="space-y-6">
        <div v-for="exp in resume.experiences" :key="exp.id">
          <div class="flex items-baseline justify-between">
            <h3 class="font-medium">{{ loc(exp.role) }} · {{ loc(exp.company) }}</h3>
            <span class="text-sm text-ink/50">{{ exp.period }}</span>
          </div>
          <p class="mt-1 text-ink/70">{{ loc(exp.description) }}</p>
        </div>
      </div>
    </section>

    <section v-if="resume.educations?.length">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-ink/50">{{ t('section.education') }}</h2>
      <div class="space-y-4">
        <div v-for="edu in resume.educations" :key="edu.id" class="flex items-baseline justify-between">
          <div>
            <h3 class="font-medium">{{ loc(edu.school) }}</h3>
            <p class="text-ink/70">{{ loc(edu.degree) }}</p>
          </div>
          <span class="text-sm text-ink/50">{{ edu.period }}</span>
        </div>
      </div>
    </section>

    <section v-if="resume.skills?.length">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-ink/50">{{ t('section.skills') }}</h2>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="skill in resume.skills"
          :key="skill.id"
          class="rounded-full border border-ink/15 px-3 py-1 text-sm"
        >
          {{ loc(skill.name) }}
        </span>
      </div>
    </section>

    <section v-if="resume.projects?.length">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-ink/50">{{ t('section.projects') }}</h2>
      <div class="space-y-6">
        <div v-for="proj in resume.projects" :key="proj.id">
          <a
            v-if="proj.link"
            :href="proj.link"
            target="_blank"
            rel="noopener"
            class="font-medium text-accent hover:underline"
          >{{ loc(proj.name) }}</a>
          <h3 v-else class="font-medium">{{ loc(proj.name) }}</h3>
          <p class="mt-1 text-ink/70">{{ loc(proj.description) }}</p>
        </div>
      </div>
    </section>
  </article>
</template>
