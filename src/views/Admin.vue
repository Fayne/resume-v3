<script setup>
import { computed, reactive, ref, watch } from 'vue'
import LocalizedField from '../components/admin/LocalizedField.vue'
import { CONTENT_FILES, getContentFileLabel } from '../content/contentFiles'
import { cloudinaryUrl, openMediaLibrary } from '../composables/useCloudinary'
import { loadContent, saveContent } from '../composables/useContentStore'
import { validateContentFile } from '../composables/useContentValidation'
import { clearConfig, getSavedConfig, saveConfig } from '../composables/useGithubApi'

const PROFILE_PATH = 'src/data/profile.json'
const SKILLS_PATH = 'src/data/skills.json'
const PROJECTS_PATH = 'src/data/projects.json'
const TIMELINE_PATH = 'src/data/timeline.json'

const config = reactive(getSavedConfig())
const path = ref(CONTENT_FILES[0])
const draft = ref(null)
const sha = ref('')
const status = ref('')
const busy = ref(false)
const validationErrors = ref([])
const isDevelopment = import.meta.env.DEV
const useLocal = ref(isDevelopment)
const canUse = computed(() => config.token && config.repo)
const currentLabel = computed(() => getContentFileLabel(path.value))
const jsonPreview = computed(() => draft.value ? JSON.stringify(draft.value, null, 2) : '')

function resetRemoteConfig(message = '已清除本地保存的 GitHub 配置。') {
  clearConfig()
  config.token = ''
  config.repo = ''
  config.branch = 'master'
  status.value = message
}

watch(draft, () => {
  runValidation()
}, { deep: true })

watch(path, () => {
  status.value = ''
  validationErrors.value = []
})

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function localizedText() {
  return { zh: '', en: '' }
}

function emptyLink() {
  return { label: '', href: '' }
}

function emptySkill() {
  return { name: '', years: 1, level: 'Advanced' }
}

function emptySkillGroup() {
  return {
    id: '',
    name: localizedText(),
    description: localizedText(),
    emphasis: 80,
    skills: [emptySkill()],
  }
}

function emptyMetric() {
  return { label: localizedText(), value: '' }
}

function emptyProject() {
  return {
    id: '',
    name: localizedText(),
    industry: localizedText(),
    period: '',
    role: localizedText(),
    team: localizedText(),
    summary: localizedText(),
    technologies: [''],
    metrics: [emptyMetric()],
    challenge: localizedText(),
    solution: localizedText(),
    outcome: localizedText(),
    lessons: [localizedText()],
  }
}

function emptyTimelineItem() {
  return {
    id: '',
    year: '',
    title: localizedText(),
    company: localizedText(),
    role: localizedText(),
    description: localizedText(),
    focus: [''],
  }
}

function runValidation() {
  if (!draft.value) {
    validationErrors.value = []
    return true
  }
  const result = validateContentFile(path.value, draft.value)
  validationErrors.value = result.errors
  return result.valid
}

async function load() {
  if (!useLocal.value && !canUse.value) return
  busy.value = true
  status.value = ''
  try {
    const file = await loadContent({ useLocal: useLocal.value, config, path: path.value })
    draft.value = cloneValue(file.content)
    sha.value = file.sha || ''
    runValidation()
    if (!useLocal.value) saveConfig(config)
    status.value = useLocal.value ? `已加载本地 ${currentLabel.value}。` : `已加载 GitHub 上的 ${currentLabel.value}。`
  } catch (error) {
    draft.value = null
    if (!useLocal.value && error?.shouldClearConfig) {
      resetRemoteConfig(`加载失败：${error.message}。已自动清空本地保存的 GitHub 配置，请重新输入。`)
    } else {
      status.value = `加载失败：${error.message}`
    }
  } finally {
    busy.value = false
  }
}

async function save() {
  if (!draft.value) return
  const isValid = runValidation()
  if (!isValid) {
    status.value = `内容校验未通过，共 ${validationErrors.value.length} 个问题。`
    return
  }

  busy.value = true
  try {
    await saveContent({ useLocal: useLocal.value, config, path: path.value, content: draft.value, sha: sha.value })
    if (!useLocal.value) saveConfig(config)
    status.value = useLocal.value
      ? '已写入本地 JSON，前台会跟随 Vite 自动刷新。'
      : '已创建 Git 提交，Cloudflare 将自动重新部署。'
    if (!useLocal.value) await load()
  } catch (error) {
    if (!useLocal.value && error?.shouldClearConfig) {
      resetRemoteConfig(`保存失败：${error.message}。已自动清空本地保存的 GitHub 配置，请重新输入。`)
    } else {
      status.value = `保存失败：${error.message}`
    }
  } finally {
    busy.value = false
  }
}

function logout() {
  resetRemoteConfig('已清除本地保存的 GitHub 配置。')
  draft.value = null
  sha.value = ''
  validationErrors.value = []
}

function addItem(list, item) {
  list.push(item)
}

function removeItem(list, index) {
  list.splice(index, 1)
}

function moveItem(list, index, direction) {
  const target = index + direction
  if (target < 0 || target >= list.length) return
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
}

function normalizeStringArray(list) {
  return list.map((item) => item ?? '')
}

async function pickAsset(assign) {
  busy.value = true
  try {
    const asset = await openMediaLibrary()
    if (!asset) {
      status.value = '已关闭媒体库，未选择图片。'
      return
    }
    assign(asset)
    runValidation()
    status.value = '图片字段已更新，确认无误后点击保存。'
  } catch (error) {
    status.value = `选图失败：${error.message}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="admin-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Private content workspace</p>
        <h1>Portfolio Admin</h1>
        <p class="intro">
          这个后台现在以 4 个 JSON 文件作为唯一持久层：本地模式直接写文件，远程模式通过 GitHub API 创建 commit。
        </p>
      </div>
    </header>

    <aside class="boundary">
      <strong>{{ useLocal ? '本地模式：' : '远程模式：' }}</strong>
      <span v-if="useLocal">使用 Vite 提供的本地内容接口，直接修改 `src/data/*.json`。</span>
      <span v-else>通过 GitHub Contents API 修改仓库文件，适合跨设备远程维护。</span>
    </aside>

    <div v-if="isDevelopment" class="mode-switch">
      <label><input v-model="useLocal" type="checkbox" /> 直接编辑本地 JSON</label>
    </div>

    <section v-if="!useLocal" class="config">
      <label>
        GitHub Fine-grained Token
        <input v-model="config.token" type="password" placeholder="github_pat_..." />
      </label>
      <label>
        Repository
        <input v-model="config.repo" placeholder="owner/repo" />
      </label>
      <label>
        Branch
        <input v-model="config.branch" placeholder="master" />
      </label>
      <button :disabled="busy || !canUse" @click="load">{{ busy ? '处理中...' : '加载' }}</button>
      <button class="secondary" :disabled="busy" @click="logout">清除会话</button>
    </section>

    <section v-else class="local-actions">
      <button :disabled="busy" @click="load">{{ busy ? '处理中...' : '加载本地文件' }}</button>
    </section>

    <p v-if="status" class="status">{{ status }}</p>

    <section class="editor">
      <div class="editor-bar">
        <label class="path-picker">
          <span>当前内容域</span>
          <select v-model="path" @change="load">
            <option v-for="file in CONTENT_FILES" :key="file" :value="file">
              {{ getContentFileLabel(file) }}
            </option>
          </select>
        </label>
        <div class="editor-meta">
          <span>{{ currentLabel }}</span>
          <span>{{ validationErrors.length ? `校验问题 ${validationErrors.length}` : '内容结构正常' }}</span>
        </div>
      </div>

      <div v-if="validationErrors.length" class="validation-errors">
        <strong>保存前需要修正以下问题：</strong>
        <ul>
          <li v-for="error in validationErrors" :key="`${error.path}-${error.message}`">
            <code>{{ error.path }}</code> {{ error.message }}
          </li>
        </ul>
      </div>

      <div v-if="!draft" class="empty-state">
        先加载一个内容文件，再开始编辑。
      </div>

      <div v-else class="content-form">
        <section v-if="path === PROFILE_PATH" class="form-stack">
          <div class="form-card">
            <LocalizedField v-model="draft.name" label="姓名" />
            <LocalizedField v-model="draft.title" label="头衔" />
            <LocalizedField v-model="draft.location" label="所在地" />
            <LocalizedField v-model="draft.availability" label="合作状态" />
            <LocalizedField v-model="draft.summary" label="个人简介" textarea :rows="5" />
            <label class="field">
              <span>Email</span>
              <input v-model="draft.email" type="email" />
            </label>
          </div>

          <div class="form-card">
            <div class="card-header">
              <div>
                <h3>Avatar</h3>
                <p>继续保存 Cloudinary 资源元数据，不把图片写进仓库。</p>
              </div>
              <button class="ghost" type="button" :disabled="busy" @click="pickAsset((asset) => { draft.avatar = asset })">
                选择图片
              </button>
            </div>
            <div class="asset-preview">
              <img :src="cloudinaryUrl(draft.avatar, { transformation: 'w_160,h_160,c_fill' })" alt="" />
              <div class="asset-meta">
                <code>{{ draft.avatar?.publicId || '未选择图片' }}</code>
                <span>v{{ draft.avatar?.version || '--' }} · {{ draft.avatar?.format || '--' }}</span>
              </div>
            </div>
          </div>

          <div class="form-card">
            <div class="card-header">
              <div>
                <h3>Links</h3>
                <p>外链信息仍然直接写入 `profile.json`。</p>
              </div>
              <button class="ghost" type="button" @click="addItem(draft.links, emptyLink())">新增链接</button>
            </div>
            <div v-for="(link, index) in draft.links" :key="index" class="array-card">
              <div class="array-toolbar">
                <strong>Link {{ index + 1 }}</strong>
                <div>
                  <button class="ghost small" type="button" @click="moveItem(draft.links, index, -1)">上移</button>
                  <button class="ghost small" type="button" @click="moveItem(draft.links, index, 1)">下移</button>
                  <button class="danger small" type="button" @click="removeItem(draft.links, index)">删除</button>
                </div>
              </div>
              <div class="two-col">
                <label class="field">
                  <span>Label</span>
                  <input v-model="link.label" type="text" />
                </label>
                <label class="field">
                  <span>Href</span>
                  <input v-model="link.href" type="text" />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="path === SKILLS_PATH" class="form-stack">
          <div class="card-header standalone">
            <div>
              <h3>Skills Groups</h3>
              <p>按能力域拆分，支持分组排序与组内技能 CRUD。</p>
            </div>
            <button class="ghost" type="button" @click="addItem(draft, emptySkillGroup())">新增分组</button>
          </div>

          <div v-for="(group, groupIndex) in draft" :key="groupIndex" class="form-card">
            <div class="array-toolbar">
              <strong>Group {{ groupIndex + 1 }}</strong>
              <div>
                <button class="ghost small" type="button" @click="moveItem(draft, groupIndex, -1)">上移</button>
                <button class="ghost small" type="button" @click="moveItem(draft, groupIndex, 1)">下移</button>
                <button class="danger small" type="button" @click="removeItem(draft, groupIndex)">删除</button>
              </div>
            </div>

            <div class="two-col">
              <label class="field">
                <span>ID</span>
                <input v-model="group.id" type="text" />
              </label>
              <label class="field">
                <span>Emphasis</span>
                <input v-model.number="group.emphasis" type="number" min="0" max="100" />
              </label>
            </div>

            <LocalizedField v-model="group.name" label="分组名称" />
            <LocalizedField v-model="group.description" label="分组描述" textarea :rows="3" />

            <div class="nested-block">
              <div class="card-header">
                <div>
                  <h3>Skills</h3>
                  <p>这里的数组会直接映射到前台能力矩阵。</p>
                </div>
                <button class="ghost" type="button" @click="addItem(group.skills, emptySkill())">新增技能</button>
              </div>

              <div v-for="(skill, skillIndex) in group.skills" :key="skillIndex" class="array-card">
                <div class="array-toolbar">
                  <strong>Skill {{ skillIndex + 1 }}</strong>
                  <div>
                    <button class="ghost small" type="button" @click="moveItem(group.skills, skillIndex, -1)">上移</button>
                    <button class="ghost small" type="button" @click="moveItem(group.skills, skillIndex, 1)">下移</button>
                    <button class="danger small" type="button" @click="removeItem(group.skills, skillIndex)">删除</button>
                  </div>
                </div>
                <div class="three-col">
                  <label class="field">
                    <span>Name</span>
                    <input v-model="skill.name" type="text" />
                  </label>
                  <label class="field">
                    <span>Years</span>
                    <input v-model.number="skill.years" type="number" min="0" max="50" />
                  </label>
                  <label class="field">
                    <span>Level</span>
                    <input v-model="skill.level" type="text" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="path === PROJECTS_PATH" class="form-stack">
          <div class="card-header standalone">
            <div>
              <h3>Projects</h3>
              <p>项目卡片、案例弹层和指标数据都从这里生成。</p>
            </div>
            <button class="ghost" type="button" @click="addItem(draft, emptyProject())">新增项目</button>
          </div>

          <div v-for="(project, projectIndex) in draft" :key="projectIndex" class="form-card">
            <div class="array-toolbar">
              <strong>Project {{ projectIndex + 1 }}</strong>
              <div>
                <button class="ghost small" type="button" @click="moveItem(draft, projectIndex, -1)">上移</button>
                <button class="ghost small" type="button" @click="moveItem(draft, projectIndex, 1)">下移</button>
                <button class="danger small" type="button" @click="removeItem(draft, projectIndex)">删除</button>
              </div>
            </div>

            <div class="two-col">
              <label class="field">
                <span>ID</span>
                <input v-model="project.id" type="text" />
              </label>
              <label class="field">
                <span>Period</span>
                <input v-model="project.period" type="text" />
              </label>
            </div>

            <LocalizedField v-model="project.name" label="项目名称" />
            <LocalizedField v-model="project.industry" label="行业" />
            <LocalizedField v-model="project.role" label="角色" />
            <LocalizedField v-model="project.team" label="团队" />
            <LocalizedField v-model="project.summary" label="项目摘要" textarea :rows="3" />
            <LocalizedField v-model="project.challenge" label="Challenge" textarea :rows="4" />
            <LocalizedField v-model="project.solution" label="Solution" textarea :rows="4" />
            <LocalizedField v-model="project.outcome" label="Outcome" textarea :rows="4" />

            <div class="nested-block">
              <div class="card-header">
                <div>
                  <h3>Technologies</h3>
                  <p>前台项目卡片和案例都会使用这些标签。</p>
                </div>
                <button class="ghost" type="button" @click="addItem(project.technologies, '')">新增技术栈</button>
              </div>
              <div v-for="(tech, techIndex) in normalizeStringArray(project.technologies)" :key="techIndex" class="array-card compact">
                <div class="array-toolbar">
                  <strong>Tech {{ techIndex + 1 }}</strong>
                  <div>
                    <button class="ghost small" type="button" @click="moveItem(project.technologies, techIndex, -1)">上移</button>
                    <button class="ghost small" type="button" @click="moveItem(project.technologies, techIndex, 1)">下移</button>
                    <button class="danger small" type="button" @click="removeItem(project.technologies, techIndex)">删除</button>
                  </div>
                </div>
                <label class="field">
                  <span>Technology</span>
                  <input v-model="project.technologies[techIndex]" type="text" />
                </label>
              </div>
            </div>

            <div class="nested-block">
              <div class="card-header">
                <div>
                  <h3>Metrics</h3>
                  <p>案例中的关键结果数据。</p>
                </div>
                <button class="ghost" type="button" @click="addItem(project.metrics, emptyMetric())">新增指标</button>
              </div>
              <div v-for="(metric, metricIndex) in project.metrics" :key="metricIndex" class="array-card">
                <div class="array-toolbar">
                  <strong>Metric {{ metricIndex + 1 }}</strong>
                  <div>
                    <button class="ghost small" type="button" @click="moveItem(project.metrics, metricIndex, -1)">上移</button>
                    <button class="ghost small" type="button" @click="moveItem(project.metrics, metricIndex, 1)">下移</button>
                    <button class="danger small" type="button" @click="removeItem(project.metrics, metricIndex)">删除</button>
                  </div>
                </div>
                <LocalizedField v-model="metric.label" label="指标说明" />
                <label class="field">
                  <span>Value</span>
                  <input v-model="metric.value" type="text" />
                </label>
              </div>
            </div>

            <div class="nested-block">
              <div class="card-header">
                <div>
                  <h3>Lessons</h3>
                  <p>案例最后的经验沉淀。</p>
                </div>
                <button class="ghost" type="button" @click="addItem(project.lessons, localizedText())">新增经验</button>
              </div>
              <div v-for="(lesson, lessonIndex) in project.lessons" :key="lessonIndex" class="array-card">
                <div class="array-toolbar">
                  <strong>Lesson {{ lessonIndex + 1 }}</strong>
                  <div>
                    <button class="ghost small" type="button" @click="moveItem(project.lessons, lessonIndex, -1)">上移</button>
                    <button class="ghost small" type="button" @click="moveItem(project.lessons, lessonIndex, 1)">下移</button>
                    <button class="danger small" type="button" @click="removeItem(project.lessons, lessonIndex)">删除</button>
                  </div>
                </div>
                <LocalizedField v-model="project.lessons[lessonIndex]" label="经验内容" textarea :rows="3" />
              </div>
            </div>

            <div class="nested-block">
              <div class="card-header">
                <div>
                  <h3>Project Image</h3>
                  <p>如果未来项目卡片需要独立封面，可以在这里直接挂 Cloudinary 资源。</p>
                </div>
                <div class="button-row">
                  <button class="ghost" type="button" :disabled="busy" @click="pickAsset((asset) => { project.image = asset })">
                    {{ project.image ? '更换图片' : '添加图片' }}
                  </button>
                  <button v-if="project.image" class="danger" type="button" @click="delete project.image">移除图片</button>
                </div>
              </div>
              <div v-if="project.image" class="asset-preview compact">
                <img :src="cloudinaryUrl(project.image, { transformation: 'w_160,h_120,c_fill' })" alt="" />
                <div class="asset-meta">
                  <code>{{ project.image.publicId }}</code>
                  <span>v{{ project.image.version }} · {{ project.image.format }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="path === TIMELINE_PATH" class="form-stack">
          <div class="card-header standalone">
            <div>
              <h3>Timeline</h3>
              <p>这里的顺序会直接影响前台时间轴展示顺序。</p>
            </div>
            <button class="ghost" type="button" @click="addItem(draft, emptyTimelineItem())">新增时间节点</button>
          </div>

          <div v-for="(item, itemIndex) in draft" :key="itemIndex" class="form-card">
            <div class="array-toolbar">
              <strong>Timeline {{ itemIndex + 1 }}</strong>
              <div>
                <button class="ghost small" type="button" @click="moveItem(draft, itemIndex, -1)">上移</button>
                <button class="ghost small" type="button" @click="moveItem(draft, itemIndex, 1)">下移</button>
                <button class="danger small" type="button" @click="removeItem(draft, itemIndex)">删除</button>
              </div>
            </div>

            <div class="two-col">
              <label class="field">
                <span>ID</span>
                <input v-model="item.id" type="text" />
              </label>
              <label class="field">
                <span>Year</span>
                <input v-model="item.year" type="text" />
              </label>
            </div>

            <LocalizedField v-model="item.title" label="标题" />
            <LocalizedField v-model="item.company" label="公司 / 项目" />
            <LocalizedField v-model="item.role" label="角色" />
            <LocalizedField v-model="item.description" label="描述" textarea :rows="4" />

            <div class="nested-block">
              <div class="card-header">
                <div>
                  <h3>Focus Tags</h3>
                  <p>时间轴上的标签数组。</p>
                </div>
                <button class="ghost" type="button" @click="addItem(item.focus, '')">新增标签</button>
              </div>
              <div v-for="(focus, focusIndex) in normalizeStringArray(item.focus)" :key="focusIndex" class="array-card compact">
                <div class="array-toolbar">
                  <strong>Tag {{ focusIndex + 1 }}</strong>
                  <div>
                    <button class="ghost small" type="button" @click="moveItem(item.focus, focusIndex, -1)">上移</button>
                    <button class="ghost small" type="button" @click="moveItem(item.focus, focusIndex, 1)">下移</button>
                    <button class="danger small" type="button" @click="removeItem(item.focus, focusIndex)">删除</button>
                  </div>
                </div>
                <label class="field">
                  <span>Tag</span>
                  <input v-model="item.focus[focusIndex]" type="text" />
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      <details v-if="draft" class="json-preview">
        <summary>查看 JSON 预览</summary>
        <textarea :value="jsonPreview" readonly spellcheck="false"></textarea>
      </details>

      <button class="commit" :disabled="busy || !draft || (!useLocal && !canUse)" @click="save">
        {{ useLocal ? '保存到本地 JSON' : 'Commit & Deploy' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.admin-page{width:min(1180px,calc(100% - 48px));margin:0 auto;padding:56px 0 72px;font-family:Manrope,"Noto Sans SC",sans-serif}
.page-header{border-bottom:1px solid #d7d5cf;padding-bottom:24px}
.page-header h1{font-size:38px;letter-spacing:-.06em;margin:0}
.intro{max-width:760px;font-size:14px;line-height:1.7;color:#555;margin:14px 0 0}
.boundary{margin:22px 0;background:#fff1dc;padding:16px 18px;font-size:13px;line-height:1.7}
.mode-switch{font-size:13px;margin:12px 0}
.config{display:grid;grid-template-columns:2fr 1.2fr 180px 110px 120px;gap:12px;align-items:end}
.config label,.path-picker,.field{display:grid;gap:6px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#666}
.config input,.path-picker select,.field input,.field textarea{width:100%;border:1px solid #d7d5cf;background:#fff;padding:11px 12px;font:14px/1.5 Manrope,"Noto Sans SC",sans-serif;outline:0}
.field textarea{resize:vertical;min-height:120px}
.config button,.local-actions button,.commit,.ghost,.danger{border:0;padding:12px 16px;font-weight:800;cursor:pointer}
.config button,.local-actions button,.commit{background:#1f2328;color:#fff}
.config .secondary{background:#777}
.local-actions{display:flex;gap:10px;margin-bottom:12px}
.status{font-size:13px;margin:10px 0 0}
.editor{margin-top:20px;border:1px solid #d7d5cf;background:#fff}
.editor-bar{display:flex;justify-content:space-between;gap:16px;padding:14px 16px;border-bottom:1px solid #d7d5cf;align-items:end;flex-wrap:wrap}
.path-picker{min-width:240px}
.editor-meta{display:flex;gap:10px;flex-wrap:wrap;font:12px "DM Mono",monospace;color:#727272}
.validation-errors{padding:16px;border-bottom:1px solid #d7d5cf;background:#fff5f3}
.validation-errors strong{display:block;margin-bottom:8px}
.validation-errors ul{margin:0;padding-left:18px;font-size:13px;line-height:1.7}
.validation-errors code{font:12px "DM Mono",monospace}
.empty-state{padding:28px 20px;color:#727272;font-size:14px}
.content-form{padding:18px;background:#faf9f6}
.form-stack{display:grid;gap:18px}
.form-card,.nested-block{display:grid;gap:16px;background:#fff;border:1px solid #d7d5cf;padding:18px}
.card-header,.array-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.card-header h3,.array-toolbar strong{margin:0;font-size:16px}
.card-header p{margin:4px 0 0;font-size:13px;line-height:1.6;color:#666}
.standalone{padding:18px;background:#f3f1eb;border:1px solid #d7d5cf}
.two-col,.three-col{display:grid;gap:12px}
.two-col{grid-template-columns:repeat(2,minmax(0,1fr))}
.three-col{grid-template-columns:repeat(3,minmax(0,1fr))}
.array-card{display:grid;gap:14px;padding:16px;border:1px solid #e0ddd5;background:#fbfbf9}
.array-card.compact{gap:10px}
.ghost{background:#fff;color:#1f2328;border:1px solid #d7d5cf}
.danger{background:#fff;color:#b42318;border:1px solid #efc2bd}
.small{padding:8px 10px;font-size:12px}
.button-row{display:flex;gap:8px;flex-wrap:wrap}
.asset-preview{display:flex;gap:16px;align-items:center}
.asset-preview.compact{padding-top:4px}
.asset-preview img{width:96px;height:96px;object-fit:cover;border:1px solid #d7d5cf;background:#efede6}
.asset-preview.compact img{width:120px;height:90px}
.asset-meta{display:grid;gap:6px}
.asset-meta code{font:12px "DM Mono",monospace;word-break:break-all}
.asset-meta span{font-size:13px;color:#666}
.json-preview{border-top:1px solid #d7d5cf;padding:12px 16px}
.json-preview summary{cursor:pointer;font-weight:800;color:#666}
.json-preview textarea{width:100%;height:280px;border:1px solid #d7d5cf;background:#fff;margin-top:12px;padding:16px;font:13px/1.6 "DM Mono",monospace;resize:vertical}
.commit{margin:0 16px 16px;background:#ff5a36}
@media(max-width:860px){
  .admin-page{width:calc(100% - 32px);padding-top:34px}
  .config{grid-template-columns:1fr}
  .two-col,.three-col{grid-template-columns:1fr}
  .editor-bar{align-items:stretch}
}
</style>
