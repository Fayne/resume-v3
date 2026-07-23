<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { vAutoAnimate } from '@formkit/auto-animate/vue'
import {
  getSavedConfig,
  saveConfig,
  clearConfig,
  fetchResumeFile,
  commitResumeFile,
} from '../composables/useGithubApi'
import { uploadImage } from '../composables/useCloudinary'

const { t } = useI18n()

const config = reactive(getSavedConfig())
const resume = ref(null)
const sha = ref('')
const status = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const uploadingKey = ref('')

let idCounter = 0
function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

async function load() {
  status.value = ''
  isLoading.value = true
  try {
    saveConfig(config)
    const { content, sha: fileSha } = await fetchResumeFile(config)
    resume.value = content
    sha.value = fileSha
  } catch (err) {
    status.value = `${t('admin.saveFail')} (${err.message})`
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!resume.value) return
  status.value = ''
  isSaving.value = true
  try {
    const commit = await commitResumeFile({
      ...config,
      content: resume.value,
      sha: sha.value,
      message: 'chore: update resume content via admin panel',
    })
    sha.value = commit?.sha || sha.value
    // GitHub 的 createOrUpdateFileContents 返回的是 content.sha，重新拉取一次保证同步
    const refreshed = await fetchResumeFile(config)
    resume.value = refreshed.content
    sha.value = refreshed.sha
    status.value = t('admin.saveSuccess')
  } catch (err) {
    status.value = `${t('admin.saveFail')} (${err.message})`
  } finally {
    isSaving.value = false
  }
}

function logout() {
  clearConfig()
  config.token = ''
  config.repo = ''
  config.branch = 'main'
  resume.value = null
}

function addExperience() {
  resume.value.experiences.push({
    id: nextId('exp'),
    company: { zh: '', en: '' },
    role: { zh: '', en: '' },
    period: '',
    description: { zh: '', en: '' },
  })
}

function addEducation() {
  resume.value.educations.push({
    id: nextId('edu'),
    school: { zh: '', en: '' },
    degree: { zh: '', en: '' },
    period: '',
  })
}

function addSkill() {
  resume.value.skills.push({ id: nextId('sk'), name: { zh: '', en: '' } })
}

function addProject() {
  resume.value.projects.push({
    id: nextId('proj'),
    name: { zh: '', en: '' },
    description: { zh: '', en: '' },
    link: '',
    image: '',
  })
}

function removeItem(list, id) {
  const idx = list.findIndex((item) => item.id === id)
  if (idx !== -1) list.splice(idx, 1)
}

function moveItem(list, id, direction) {
  const idx = list.findIndex((item) => item.id === id)
  const target = idx + direction
  if (idx === -1 || target < 0 || target >= list.length) return
  const [item] = list.splice(idx, 1)
  list.splice(target, 0, item)
}

async function handleImageUpload(event, target, key) {
  const file = event.target.files?.[0]
  if (!file) return
  uploadingKey.value = key
  try {
    const url = await uploadImage(file)
    target[key] = url
  } catch (err) {
    status.value = err.message
  } finally {
    uploadingKey.value = ''
  }
}

onMounted(() => {
  if (config.token && config.repo) load()
})
</script>

<template>
  <div class="space-y-8">
    <h1 class="font-serif text-2xl">{{ t('admin.title') }}</h1>

    <!-- 连接配置 -->
    <section class="space-y-3 rounded-lg border border-ink/10 p-4">
      <div>
        <label class="text-sm text-ink/60">{{ t('admin.tokenLabel') }}</label>
        <input
          v-model="config.token"
          type="password"
          :placeholder="t('admin.tokenPlaceholder')"
          class="mt-1 w-full rounded border border-ink/15 px-3 py-2 text-sm"
        />
        <p class="mt-1 text-xs text-ink/40">{{ t('admin.tokenHint') }}</p>
      </div>
      <div class="flex gap-3">
        <div class="flex-1">
          <label class="text-sm text-ink/60">{{ t('admin.repoLabel') }}</label>
          <input
            v-model="config.repo"
            placeholder="yourname/resume-site"
            class="mt-1 w-full rounded border border-ink/15 px-3 py-2 text-sm"
          />
        </div>
        <div class="w-32">
          <label class="text-sm text-ink/60">{{ t('admin.branchLabel') }}</label>
          <input
            v-model="config.branch"
            placeholder="main"
            class="mt-1 w-full rounded border border-ink/15 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="rounded bg-ink px-4 py-2 text-sm text-paper disabled:opacity-40"
          :disabled="isLoading || !config.token || !config.repo"
          @click="load"
        >
          {{ isLoading ? t('admin.loading') : t('admin.load') }}
        </button>
        <button class="text-sm text-ink/50 hover:text-ink" @click="logout">
          {{ t('admin.logout') }}
        </button>
      </div>
    </section>

    <p v-if="status" class="rounded border border-ink/10 bg-ink/5 px-3 py-2 text-sm">{{ status }}</p>

    <template v-if="resume">
      <!-- 个人信息 -->
      <section class="space-y-3 rounded-lg border border-ink/10 p-4">
        <h2 class="font-medium">{{ t('section.summary') }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <input v-model="resume.profile.name.zh" :placeholder="t('admin.zhLabel') + ' - 姓名'" class="rounded border border-ink/15 px-3 py-2 text-sm" />
          <input v-model="resume.profile.name.en" :placeholder="t('admin.enLabel') + ' - Name'" class="rounded border border-ink/15 px-3 py-2 text-sm" />
          <input v-model="resume.profile.title.zh" placeholder="职位头衔" class="rounded border border-ink/15 px-3 py-2 text-sm" />
          <input v-model="resume.profile.title.en" placeholder="Job title" class="rounded border border-ink/15 px-3 py-2 text-sm" />
          <input v-model="resume.profile.location.zh" placeholder="所在地" class="rounded border border-ink/15 px-3 py-2 text-sm" />
          <input v-model="resume.profile.location.en" placeholder="Location" class="rounded border border-ink/15 px-3 py-2 text-sm" />
          <input v-model="resume.profile.email" placeholder="Email" class="rounded border border-ink/15 px-3 py-2 text-sm" />
          <input v-model="resume.profile.phone" placeholder="Phone" class="rounded border border-ink/15 px-3 py-2 text-sm" />
        </div>
        <textarea v-model="resume.profile.summary.zh" placeholder="中文简介" rows="3" class="w-full rounded border border-ink/15 px-3 py-2 text-sm"></textarea>
        <textarea v-model="resume.profile.summary.en" placeholder="English summary" rows="3" class="w-full rounded border border-ink/15 px-3 py-2 text-sm"></textarea>
        <div class="flex items-center gap-3">
          <img v-if="resume.profile.avatar" :src="resume.profile.avatar" class="h-12 w-12 rounded-full object-cover" />
          <label class="cursor-pointer text-sm text-accent">
            {{ uploadingKey === 'avatar' ? t('admin.uploading') : t('admin.uploadImage') }}
            <input type="file" accept="image/*" class="hidden" @change="handleImageUpload($event, resume.profile, 'avatar')" />
          </label>
        </div>
      </section>

      <!-- 工作经历 -->
      <section class="space-y-3 rounded-lg border border-ink/10 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-medium">{{ t('section.experience') }}</h2>
          <button class="text-sm text-accent" @click="addExperience">+ {{ t('admin.addItem') }}</button>
        </div>
        <div v-auto-animate class="space-y-4">
          <div v-for="(exp, i) in resume.experiences" :key="exp.id" class="rounded border border-ink/10 p-3">
            <div class="grid grid-cols-2 gap-2">
              <input v-model="exp.company.zh" placeholder="公司（中）" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
              <input v-model="exp.company.en" placeholder="Company (EN)" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
              <input v-model="exp.role.zh" placeholder="职位（中）" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
              <input v-model="exp.role.en" placeholder="Role (EN)" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
            </div>
            <input v-model="exp.period" placeholder="时间段，例如 2023.01 - 至今" class="mt-2 w-full rounded border border-ink/15 px-2 py-1.5 text-sm" />
            <textarea v-model="exp.description.zh" placeholder="工作描述（中）" rows="2" class="mt-2 w-full rounded border border-ink/15 px-2 py-1.5 text-sm"></textarea>
            <textarea v-model="exp.description.en" placeholder="Description (EN)" rows="2" class="mt-2 w-full rounded border border-ink/15 px-2 py-1.5 text-sm"></textarea>
            <div class="mt-2 flex gap-3 text-xs text-ink/50">
              <button @click="moveItem(resume.experiences, exp.id, -1)">↑ {{ t('admin.moveUp') }}</button>
              <button @click="moveItem(resume.experiences, exp.id, 1)">↓ {{ t('admin.moveDown') }}</button>
              <button class="text-red-500" @click="removeItem(resume.experiences, exp.id)">{{ t('admin.delete') }}</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 教育背景 -->
      <section class="space-y-3 rounded-lg border border-ink/10 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-medium">{{ t('section.education') }}</h2>
          <button class="text-sm text-accent" @click="addEducation">+ {{ t('admin.addItem') }}</button>
        </div>
        <div v-auto-animate class="space-y-4">
          <div v-for="edu in resume.educations" :key="edu.id" class="rounded border border-ink/10 p-3">
            <div class="grid grid-cols-2 gap-2">
              <input v-model="edu.school.zh" placeholder="学校（中）" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
              <input v-model="edu.school.en" placeholder="School (EN)" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
              <input v-model="edu.degree.zh" placeholder="学位（中）" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
              <input v-model="edu.degree.en" placeholder="Degree (EN)" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
            </div>
            <input v-model="edu.period" placeholder="时间段" class="mt-2 w-full rounded border border-ink/15 px-2 py-1.5 text-sm" />
            <div class="mt-2 flex gap-3 text-xs text-ink/50">
              <button @click="moveItem(resume.educations, edu.id, -1)">↑ {{ t('admin.moveUp') }}</button>
              <button @click="moveItem(resume.educations, edu.id, 1)">↓ {{ t('admin.moveDown') }}</button>
              <button class="text-red-500" @click="removeItem(resume.educations, edu.id)">{{ t('admin.delete') }}</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 技能 -->
      <section class="space-y-3 rounded-lg border border-ink/10 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-medium">{{ t('section.skills') }}</h2>
          <button class="text-sm text-accent" @click="addSkill">+ {{ t('admin.addItem') }}</button>
        </div>
        <div v-auto-animate class="space-y-2">
          <div v-for="skill in resume.skills" :key="skill.id" class="flex items-center gap-2">
            <input v-model="skill.name.zh" placeholder="技能（中）" class="flex-1 rounded border border-ink/15 px-2 py-1.5 text-sm" />
            <input v-model="skill.name.en" placeholder="Skill (EN)" class="flex-1 rounded border border-ink/15 px-2 py-1.5 text-sm" />
            <button class="text-xs text-red-500" @click="removeItem(resume.skills, skill.id)">{{ t('admin.delete') }}</button>
          </div>
        </div>
      </section>

      <!-- 项目经历 -->
      <section class="space-y-3 rounded-lg border border-ink/10 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-medium">{{ t('section.projects') }}</h2>
          <button class="text-sm text-accent" @click="addProject">+ {{ t('admin.addItem') }}</button>
        </div>
        <div v-auto-animate class="space-y-4">
          <div v-for="proj in resume.projects" :key="proj.id" class="rounded border border-ink/10 p-3">
            <div class="grid grid-cols-2 gap-2">
              <input v-model="proj.name.zh" placeholder="项目名（中）" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
              <input v-model="proj.name.en" placeholder="Project name (EN)" class="rounded border border-ink/15 px-2 py-1.5 text-sm" />
            </div>
            <textarea v-model="proj.description.zh" placeholder="项目描述（中）" rows="2" class="mt-2 w-full rounded border border-ink/15 px-2 py-1.5 text-sm"></textarea>
            <textarea v-model="proj.description.en" placeholder="Description (EN)" rows="2" class="mt-2 w-full rounded border border-ink/15 px-2 py-1.5 text-sm"></textarea>
            <input v-model="proj.link" placeholder="项目链接（可选）" class="mt-2 w-full rounded border border-ink/15 px-2 py-1.5 text-sm" />
            <div class="mt-2 flex items-center gap-3">
              <img v-if="proj.image" :src="proj.image" class="h-10 w-10 rounded object-cover" />
              <label class="cursor-pointer text-sm text-accent">
                {{ uploadingKey === proj.id ? t('admin.uploading') : t('admin.uploadImage') }}
                <input type="file" accept="image/*" class="hidden" @change="handleImageUpload($event, proj, 'image')" />
              </label>
            </div>
            <div class="mt-2 flex gap-3 text-xs text-ink/50">
              <button class="text-red-500" @click="removeItem(resume.projects, proj.id)">{{ t('admin.delete') }}</button>
            </div>
          </div>
        </div>
      </section>

      <button
        class="w-full rounded bg-accent py-3 text-sm font-medium text-white disabled:opacity-40"
        :disabled="isSaving"
        @click="save"
      >
        {{ isSaving ? t('admin.saving') : t('admin.save') }}
      </button>
    </template>
  </div>
</template>
