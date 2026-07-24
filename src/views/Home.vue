<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitch from '../components/LanguageSwitch.vue'
import { getSkillGroupLevelMeta, normalizeSkillGroupLevel } from '../content/skillGroupLevels'
import { cloudinaryUrl } from '../composables/useCloudinary'
import profile from '../data/profile.json'
import skills from '../data/skills.json'
import projects from '../data/projects.json'
import timeline from '../data/timeline.json'

const { locale, t } = useI18n()
const selected = ref(null)
const showBackToTop = ref(false)
const projectRail = ref(null)
const canScrollPrev = ref(false)
const canScrollNext = ref(true)
const activeSkillIndex = ref(0)
const capabilityStudio = ref(null)
const capabilityNav = ref(null)
const capabilityNavButtons = ref([])
const skillAutoplayPaused = ref(false)
let skillAutoplayTimer = null
let capabilityResizeObserver = null
const loc = (value) => value && typeof value === 'object' ? value[locale.value] || value.zh || value.en || '' : value || ''
const avatar = cloudinaryUrl(profile.avatar)
const updateScrollState = () => { showBackToTop.value = window.scrollY > 500 }
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
const hasMetrics = (project) => Array.isArray(project?.metrics) && project.metrics.length > 0
const hasLessons = (project) => Array.isArray(project?.lessons) && project.lessons.length > 0
const hasProjectAccess = (project) => {
  if (project?.access?.type === 'url') return Boolean(project.access.href)
  if (project?.access?.type === 'qr') return Boolean(project.access.image?.publicId)
  return false
}
const normalizedSkills = computed(() => skills.map((group) => ({
  ...group,
  level: normalizeSkillGroupLevel(group.level ?? group.emphasis) || 'core',
})))
const activeSkillGroup = computed(() => normalizedSkills.value[activeSkillIndex.value] || normalizedSkills.value[0] || null)

function skillGroupLevelLabel(value) {
  const meta = getSkillGroupLevelMeta(value)
  if (!meta) return ''
  return locale.value === 'zh' ? meta.zh : meta.en
}

function skillGroupLevelRank(value) {
  return getSkillGroupLevelMeta(value)?.rank || 0
}

function updateProjectRailState() {
  const rail = projectRail.value
  if (!rail) return
  canScrollPrev.value = rail.scrollLeft > 8
  canScrollNext.value = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8
}

function scrollProjects(direction) {
  const rail = projectRail.value
  if (!rail) return
  rail.scrollBy({ left: direction * rail.clientWidth * 0.78, behavior: 'smooth' })
}

function activateSkill(index) {
  activeSkillIndex.value = index
}

function scrollCapabilityNavToIndex(index) {
  const nav = capabilityNav.value
  const button = capabilityNavButtons.value[index]
  if (!nav || !button) return
  const buttonTop = button.offsetTop
  const buttonBottom = buttonTop + button.offsetHeight
  const viewTop = nav.scrollTop
  const viewBottom = viewTop + nav.clientHeight

  if (buttonTop < viewTop) {
    nav.scrollTo({ top: buttonTop - 8, behavior: 'smooth' })
    return
  }

  if (buttonBottom > viewBottom) {
    nav.scrollTo({ top: buttonBottom - nav.clientHeight + 8, behavior: 'smooth' })
  }
}

function syncCapabilityNavHeight() {
  const studio = capabilityStudio.value
  const nav = capabilityNav.value
  if (!studio || !nav) return
  if (window.innerWidth <= 700) {
    nav.style.removeProperty('--capability-nav-height')
    return
  }
  nav.style.setProperty('--capability-nav-height', `${studio.offsetHeight}px`)
}

function pauseSkillAutoplay() {
  skillAutoplayPaused.value = true
}

function resumeSkillAutoplay() {
  skillAutoplayPaused.value = false
}

function stopSkillAutoplay() {
  if (skillAutoplayTimer) window.clearInterval(skillAutoplayTimer)
  skillAutoplayTimer = null
}

function startSkillAutoplay() {
  stopSkillAutoplay()
  if (typeof window === 'undefined' || normalizedSkills.value.length <= 1) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  skillAutoplayTimer = window.setInterval(() => {
    if (skillAutoplayPaused.value) return
    activeSkillIndex.value = (activeSkillIndex.value + 1) % normalizedSkills.value.length
  }, 3200)
}

watchEffect(() => {
  document.title = `${t('common.resume')} | ${loc(profile.name)}`
  document.documentElement.lang = locale.value === 'zh' ? 'zh-CN' : 'en'
})

watch(activeSkillIndex, async (index) => {
  await nextTick()
  scrollCapabilityNavToIndex(index)
})

watch(normalizedSkills, () => {
  if (activeSkillIndex.value >= normalizedSkills.value.length) activeSkillIndex.value = 0
  startSkillAutoplay()
}, { deep: true })

onMounted(async () => {
  window.addEventListener('scroll', updateScrollState, { passive: true })
  window.addEventListener('resize', updateProjectRailState)
  window.addEventListener('resize', syncCapabilityNavHeight)
  capabilityResizeObserver = new ResizeObserver(() => syncCapabilityNavHeight())
  if (capabilityStudio.value) capabilityResizeObserver.observe(capabilityStudio.value)
  await nextTick()
  updateProjectRailState()
  syncCapabilityNavHeight()
  startSkillAutoplay()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateScrollState)
  window.removeEventListener('resize', updateProjectRailState)
  window.removeEventListener('resize', syncCapabilityNavHeight)
  capabilityResizeObserver?.disconnect()
  stopSkillAutoplay()
})
</script>

<template>
  <main class="portfolio">
    <nav class="portfolio-nav shell">
      <a class="wordmark" href="#top">{{ loc(profile.name) }}</a>
      <div class="nav-links">
        <a href="#work">{{ locale === 'zh' ? '精选项目' : 'Work' }}</a>
        <a href="#capabilities">{{ locale === 'zh' ? '能力矩阵' : 'Capabilities' }}</a>
        <a href="#journey">{{ locale === 'zh' ? '职业历程' : 'Journey' }}</a>
        <LanguageSwitch />
      </div>
    </nav>

    <section id="top" class="hero shell">
      <p class="eyebrow">{{ loc(profile.location) }}</p>
      <div class="hero-grid">
        <div>
          <h1>{{ loc(profile.title) }}</h1>
          <p class="hero-summary">{{ loc(profile.summary) }}</p>
        </div>
        <img class="profile-photo" :src="avatar" :alt="loc(profile.name)" />
      </div>
      <div class="hero-footer">
        <span class="availability"><i></i>{{ loc(profile.availabilityStatus || profile.availability) }}</span>
        <div class="hero-footer-right">
          <div v-if="profile.workModes?.length" class="tags availability-tags">
            <span v-for="mode in profile.workModes" :key="loc(mode)">{{ loc(mode) }}</span>
          </div>
          <div class="links">
            <a v-for="link in profile.links" :key="link.label" :href="link.href">{{ link.label }} ↗</a>
          </div>
        </div>
      </div>
    </section>

    <section id="work" class="portfolio-section shell">
      <div class="section-heading">
        <p class="eyebrow">01 / {{ locale === 'zh' ? '精选项目' : 'Selected work' }}</p>
        <h2>{{ locale === 'zh' ? '复杂系统，\n为业务所用。' : 'Complex systems,\nmade useful.' }}</h2>
      </div>
      <div class="project-rail-shell">
        <div class="project-rail-actions">
          <button class="rail-button" type="button" :disabled="!canScrollPrev" :aria-label="locale === 'zh' ? '查看上一个项目' : 'Show previous project'" @click="scrollProjects(-1)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <button class="rail-button" type="button" :disabled="!canScrollNext" :aria-label="locale === 'zh' ? '查看下一个项目' : 'Show next project'" @click="scrollProjects(1)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </button>
        </div>
        <div ref="projectRail" class="project-rail" @scroll.passive="updateProjectRailState">
          <article v-for="project in projects" :key="project.id" class="project-card project-slide" @click="selected=project">
            <div class="project-top"><span>{{ loc(project.industry) }}</span><span>{{ project.period }}</span></div>
            <h3>{{ loc(project.name) }}</h3>
            <p>{{ loc(project.summary) }}</p>
            <div class="tags"><span v-for="tech in project.technologies" :key="tech">{{ tech }}</span></div>
            <button>{{ locale === 'zh' ? '查看案例' : 'View case study' }} <b>↗</b></button>
          </article>
        </div>
      </div>
    </section>

    <section id="capabilities" class="portfolio-section shell">
      <div class="section-heading">
        <p class="eyebrow">02 / {{ locale === 'zh' ? '能力矩阵' : 'Capability matrix' }}</p>
        <h2>{{ locale === 'zh' ? '在关键处，\n保持足够深度。' : 'Depth where it\nmoves the needle.' }}</h2>
      </div>
      <div
        ref="capabilityStudio"
        class="capability-studio"
        @mouseenter="pauseSkillAutoplay"
        @mouseleave="resumeSkillAutoplay"
        @focusin="pauseSkillAutoplay"
        @focusout="resumeSkillAutoplay"
      >
        <div ref="capabilityNav" class="capability-nav" role="tablist" :aria-label="locale === 'zh' ? '能力域列表' : 'Capability groups'">
          <button
            v-for="(group, index) in normalizedSkills"
            :key="group.id"
            :ref="(el) => { capabilityNavButtons[index] = el }"
            class="capability-tab"
            :class="{ active: index === activeSkillIndex }"
            type="button"
            role="tab"
            :aria-selected="index === activeSkillIndex"
            @click="activateSkill(index)"
          >
            <span class="capability-tab-meta">{{ skillGroupLevelLabel(group.level) }}</span>
            <strong>{{ loc(group.name) }}</strong>
            <small>{{ loc(group.description) }}</small>
          </button>
        </div>

        <article v-if="activeSkillGroup" class="capability-stage">
          <div class="capability-stage-head">
            <div>
              <p class="eyebrow">{{ locale === 'zh' ? '当前聚焦' : 'Now focused' }}</p>
              <h3>{{ loc(activeSkillGroup.name) }}</h3>
            </div>
            <p class="capability-score">{{ skillGroupLevelLabel(activeSkillGroup.level) }}</p>
          </div>
          <p class="capability-summary">{{ loc(activeSkillGroup.description) }}</p>
          <div class="capability-meter" :aria-label="skillGroupLevelLabel(activeSkillGroup.level)">
            <span
              v-for="step in 4"
              :key="step"
              :class="{ active: step <= skillGroupLevelRank(activeSkillGroup.level) }"
            ></span>
          </div>
          <div class="capability-grid">
            <article v-for="skill in activeSkillGroup.skills" :key="skill.name" class="capability-card">
              <strong>{{ skill.name }}</strong>
              <span>{{ skill.level }}</span>
              <p v-if="loc(skill.description)">{{ loc(skill.description) }}</p>
              <small>{{ skill.years }}y</small>
            </article>
          </div>
        </article>
      </div>
    </section>

    <section id="journey" class="portfolio-section shell">
      <div class="section-heading">
        <p class="eyebrow">03 / {{ locale === 'zh' ? '职业历程' : 'Career journey' }}</p>
        <h2>{{ locale === 'zh' ? '持续积累的\n工程能力。' : 'A record of\ncompounding craft.' }}</h2>
      </div>
      <div class="timeline">
        <article v-for="item in timeline" :key="item.id" class="timeline-item">
          <div class="timeline-year">{{ item.year }}</div>
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <p>{{ loc(item.company) }} · {{ loc(item.role) }}</p>
            <h3>{{ loc(item.title) }}</h3>
            <p class="timeline-description">{{ loc(item.description) }}</p>
            <div class="tags"><span v-for="tag in item.focus" :key="tag">{{ tag }}</span></div>
          </div>
        </article>
      </div>
    </section>

    <footer class="shell portfolio-footer">
      <span>© {{ new Date().getFullYear() }} {{ loc(profile.name) }}</span>
      <a :href="'mailto:'+profile.email">{{ locale === 'zh' ? '开始交流' : 'Start a conversation' }} ↗</a>
    </footer>

    <button v-show="showBackToTop" class="back-to-top" type="button" :aria-label="locale === 'zh' ? '返回页头' : 'Back to top'" @click="scrollToTop">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6M7.5 10.5 12 6l4.5 4.5" /></svg>
    </button>

    <div v-if="selected" class="case-backdrop" @click.self="selected=null">
      <article class="case-study">
        <button class="close" @click="selected=null">×</button>
        <p class="eyebrow">{{ locale === 'zh' ? '项目案例' : 'Case study' }} / {{ selected.period }}</p>
        <div class="case-heading">
          <h2>{{ loc(selected.name) }}</h2>
          <div v-if="hasProjectAccess(selected)" class="case-access-group">
            <a
              v-if="selected.access?.type === 'url'"
              class="case-access-button"
              :href="selected.access.href"
              target="_blank"
              rel="noreferrer"
              :aria-label="loc(selected.access.label)"
              :title="loc(selected.access.label)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M10 14 19 5M19 14v5h-5M5 10V5h5M5 19h5v-5" /></svg>
            </a>
            <div
              v-else-if="selected.access?.type === 'qr' && selected.access.image"
              class="case-access-qr"
              tabindex="0"
              :aria-label="loc(selected.access.label)"
              :title="loc(selected.access.label)"
            >
              <span class="case-access-button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm11 1h1m2 0h2m-5 2h3m1 0h1m-5 2h1m2 0h3" /></svg>
              </span>
              <div class="qr-popover">
                <img :src="cloudinaryUrl(selected.access.image, { transformation: 'w_280,h_280,c_fit' })" :alt="loc(selected.access.label)" />
                <span>{{ loc(selected.access.label) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="case-meta"><span>{{ loc(selected.role) }}</span><span>{{ loc(selected.team) }}</span></div>
        <div class="case-flow">
          <section><h3>{{ locale === 'zh' ? '挑战' : 'Challenge' }}</h3><p>{{ loc(selected.challenge) }}</p></section>
          <section><h3>{{ locale === 'zh' ? '解决方案' : 'Solution' }}</h3><p>{{ loc(selected.solution) }}</p></section>
        </div>
        <div v-if="hasMetrics(selected)" class="metrics"><div v-for="metric in selected.metrics" :key="metric.value"><b>{{ metric.value }}</b><span>{{ loc(metric.label) }}</span></div></div>
        <template v-if="hasLessons(selected)">
          <h3>{{ locale === 'zh' ? '经验沉淀' : 'What stayed with me' }}</h3>
          <ul class="lessons"><li v-for="lesson in selected.lessons" :key="loc(lesson)">{{ loc(lesson) }}</li></ul>
        </template>
      </article>
    </div>
  </main>
</template>
