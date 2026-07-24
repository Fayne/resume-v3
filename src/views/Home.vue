<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitch from '../components/LanguageSwitch.vue'
import { cloudinaryUrl } from '../composables/useCloudinary'
import profile from '../data/profile.json'
import skills from '../data/skills.json'
import projects from '../data/projects.json'
import timeline from '../data/timeline.json'

const { locale } = useI18n()
const selected = ref(null)
const showBackToTop = ref(false)
const loc = (value) => value && typeof value === 'object' ? value[locale.value] || value.zh || value.en || '' : value || ''
const avatar = cloudinaryUrl(profile.avatar)
const updateScrollState = () => { showBackToTop.value = window.scrollY > 500 }
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
onMounted(() => window.addEventListener('scroll', updateScrollState, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', updateScrollState))
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
      <div class="project-grid">
        <article v-for="project in projects" :key="project.id" class="project-card" @click="selected=project">
          <div class="project-top"><span>{{ loc(project.industry) }}</span><span>{{ project.period }}</span></div>
          <h3>{{ loc(project.name) }}</h3>
          <p>{{ loc(project.summary) }}</p>
          <div class="tags"><span v-for="tech in project.technologies" :key="tech">{{ tech }}</span></div>
          <button>{{ locale === 'zh' ? '查看案例' : 'View case study' }} <b>↗</b></button>
        </article>
      </div>
    </section>

    <section id="capabilities" class="portfolio-section shell">
      <div class="section-heading">
        <p class="eyebrow">02 / {{ locale === 'zh' ? '能力矩阵' : 'Capability matrix' }}</p>
        <h2>{{ locale === 'zh' ? '在关键处，\n保持足够深度。' : 'Depth where it\nmoves the needle.' }}</h2>
      </div>
      <div class="skills-grid">
        <article v-for="group in skills" :key="group.id" class="skill-card">
          <div class="skill-card-head">
            <div><h3>{{ loc(group.name) }}</h3><p>{{ loc(group.description) }}</p></div>
            <strong>{{ group.emphasis }}<small>%</small></strong>
          </div>
          <div class="emphasis-track"><span :style="{width:group.emphasis+'%'}"></span></div>
          <ul><li v-for="skill in group.skills" :key="skill.name"><span>{{ skill.name }}</span><span class="skill-meta">{{ skill.years }}y · {{ skill.level }}</span></li></ul>
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
        <h2>{{ loc(selected.name) }}</h2>
        <div class="case-meta"><span>{{ loc(selected.role) }}</span><span>{{ loc(selected.team) }}</span></div>
        <div class="case-flow">
          <section><h3>{{ locale === 'zh' ? '挑战' : 'Challenge' }}</h3><p>{{ loc(selected.challenge) }}</p></section>
          <section><h3>{{ locale === 'zh' ? '解决方案' : 'Solution' }}</h3><p>{{ loc(selected.solution) }}</p></section>
          <section><h3>{{ locale === 'zh' ? '成果' : 'Outcome' }}</h3><p>{{ loc(selected.outcome) }}</p></section>
        </div>
        <div class="metrics"><div v-for="metric in selected.metrics" :key="metric.value"><b>{{ metric.value }}</b><span>{{ loc(metric.label) }}</span></div></div>
        <h3>{{ locale === 'zh' ? '经验沉淀' : 'What stayed with me' }}</h3>
        <ul class="lessons"><li v-for="lesson in selected.lessons" :key="loc(lesson)">{{ loc(lesson) }}</li></ul>
      </article>
    </div>
  </main>
</template>
