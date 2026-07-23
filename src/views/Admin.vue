<script setup>
import { computed, reactive, ref } from 'vue'
import { CONTENT_FILES, clearConfig, commitContentFile, fetchContentFile, getSavedConfig, saveConfig } from '../composables/useGithubApi'
import { openMediaLibrary, cloudinaryUrl } from '../composables/useCloudinary'

const config = reactive(getSavedConfig())
const path = ref(CONTENT_FILES[0]); const content = ref(''); const sha = ref(''); const status = ref(''); const busy = ref(false)
const isDevelopment = import.meta.env.DEV
const useLocal = ref(isDevelopment)
const canUse = computed(() => config.token && config.repo)

// 当前 JSON 里识别到的图片字段：{ path: 'avatar', asset: {publicId, version, format} }
const imageFields = ref([])
const newImagePath = ref('')

function isCloudinaryAsset(value) {
  return (
    value && typeof value === 'object' && !Array.isArray(value) &&
    typeof value.publicId === 'string' && typeof value.version === 'string' && typeof value.format === 'string'
  )
}

// 递归遍历 JSON，找出所有形如 {publicId, version, format} 的图片字段，记录点分路径
function walk(value, pathPrefix, results) {
  if (isCloudinaryAsset(value)) {
    results.push({ path: pathPrefix, asset: value })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walk(item, pathPrefix ? `${pathPrefix}.${idx}` : String(idx), results))
    return
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, val]) => walk(val, pathPrefix ? `${pathPrefix}.${key}` : key, results))
  }
}

function scanImageFields() {
  try {
    imageFields.value = []
    const parsed = JSON.parse(content.value || '{}')
    walk(parsed, '', imageFields.value)
  } catch {
    imageFields.value = []
  }
}

// 按 "a.b.0.c" 这样的点分路径写入嵌套字段，数字会被当成数组下标
function setByPath(obj, pathStr, value) {
  const keys = pathStr.split('.').filter(Boolean)
  if (!keys.length) throw new Error('字段路径不能为空')
  let target = obj
  keys.forEach((key, idx) => {
    const isLast = idx === keys.length - 1
    if (isLast) {
      target[key] = value
      return
    }
    if (target[key] == null || typeof target[key] !== 'object') {
      target[key] = /^\d+$/.test(keys[idx + 1]) ? [] : {}
    }
    target = target[key]
  })
}

async function load() {
  if (!useLocal.value && !canUse.value) return
  busy.value = true; status.value = ''
  try {
    if (useLocal.value) {
      const response = await fetch(`/__portfolio-admin/content?file=${encodeURIComponent(path.value)}`)
      if (!response.ok) throw new Error('本地内容接口不可用。请通过 npm run dev:admin 启动。')
      content.value = JSON.stringify(await response.json(), null, 2)
      status.value = '已加载本地文件。'
    } else {
      saveConfig(config)
      const file = await fetchContentFile({ ...config, path: path.value })
      content.value = JSON.stringify(file.content, null, 2)
      sha.value = file.sha
      status.value = '已加载 GitHub 当前版本。'
    }
    scanImageFields()
  } catch (error) {
    status.value = `加载失败：${error.message}`
  } finally {
    busy.value = false
  }
}

async function save() {
  let parsed
  try { parsed = JSON.parse(content.value) } catch { status.value = 'JSON 格式无效，请修正后再提交。'; return }
  busy.value = true
  try {
    if (useLocal.value) {
      const response = await fetch(`/__portfolio-admin/content?file=${encodeURIComponent(path.value)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed),
      })
      if (!response.ok) throw new Error('无法写入本地文件。')
      status.value = '已写入本地 JSON，Vite 会自动刷新页面。'
    } else {
      await commitContentFile({ ...config, path: path.value, content: parsed, sha: sha.value })
      await load()
      status.value = '已创建 Git 提交，Cloudflare Pages 将自动部署。'
    }
  } catch (error) {
    status.value = `提交失败：${error.message}`
  } finally {
    busy.value = false
  }
}

// 点击某个已识别到的图片字段旁边的"更换图片"
async function replaceImageAt(targetPath) {
  busy.value = true
  try {
    const asset = await openMediaLibrary()
    if (!asset) { status.value = '已关闭 Media Library，未选择图片。'; return }
    let parsed
    try { parsed = JSON.parse(content.value || '{}') }
    catch { status.value = '当前 JSON 格式有误，无法自动写入，请先修正 JSON。'; return }
    setByPath(parsed, targetPath, asset)
    content.value = JSON.stringify(parsed, null, 2)
    scanImageFields()
    status.value = `已更新字段 "${targetPath}"，检查无误后点击下方按钮提交。`
  } catch (error) {
    status.value = error.message
  } finally {
    busy.value = false
  }
}

// 高级操作：给一个还不存在的字段插入新图片（比如新加的项目还没有 image 字段）
async function addImageAt() {
  if (!newImagePath.value.trim()) { status.value = '请先填写要插入的字段路径。'; return }
  busy.value = true
  try {
    const asset = await openMediaLibrary()
    if (!asset) { status.value = '已关闭 Media Library，未选择图片。'; return }
    let parsed
    try { parsed = JSON.parse(content.value || '{}') }
    catch { status.value = '当前 JSON 格式有误，无法自动写入，请先修正 JSON。'; return }
    setByPath(parsed, newImagePath.value.trim(), asset)
    content.value = JSON.stringify(parsed, null, 2)
    scanImageFields()
    status.value = `已插入字段 "${newImagePath.value}"，检查无误后点击下方按钮提交。`
    newImagePath.value = ''
  } catch (error) {
    status.value = error.message
  } finally {
    busy.value = false
  }
}

function logout() { clearConfig(); config.token = ''; config.repo = ''; content.value = ''; sha.value = ''; imageFields.value = [] }
</script>

<template>
  <main class="admin-page">
    <header><div><p class="eyebrow">Private content workspace</p><h1>Portfolio Admin</h1></div></header>
    <aside><strong>{{ useLocal ? '本地开发模式：' : '安全边界：' }}</strong>{{ useLocal ? '修改会直接写入当前项目的 src/data JSON 文件；此接口只存在于 Vite 开发服务器。' : '此构建只能部署在受 Cloudflare Access（GitHub 身份）保护的独立 Admin 域名。Token 仅保存在当前浏览器会话，不会写入仓库。' }}</aside>
    <div v-if="isDevelopment" class="mode-switch"><label><input v-model="useLocal" type="checkbox" /> 直接修改本地 JSON</label></div>
    <section v-if="!useLocal" class="config">
      <label>GitHub Fine-grained Token<input v-model="config.token" type="password" placeholder="github_pat_…" /></label>
      <label>Repository<input v-model="config.repo" placeholder="owner/repo" /></label>
      <label>Branch<input v-model="config.branch" /></label>
      <button :disabled="busy || !canUse" @click="load">{{ busy ? '处理中…' : '加载' }}</button>
      <button class="ghost" type="button" v-show="!!content" :disabled="busy || !content" @click="scanImageFields">扫描图片字段</button>
      <button class="secondary" @click="logout">清除会话</button>
    </section>
    <section v-else class="local-actions">
      <button :disabled="busy" @click="load">{{ busy ? '处理中…' : '加载本地文件' }}</button>
      <button class="ghost" type="button" v-show="!!content" :disabled="busy || !content" @click="scanImageFields">扫描图片字段</button>
    </section>

    <p v-if="status" class="status">{{ status }}</p>

    <section class="editor">
      <div class="editor-bar">
        <select v-model="path" @change="load">
          <option v-for="file in CONTENT_FILES" :key="file">{{ file }}</option>
        </select>
      </div>

      <div v-if="imageFields.length" class="image-fields">
        <div v-for="field in imageFields" :key="field.path" class="image-field">
          <img :src="cloudinaryUrl(field.asset, { transformation: 'w_64,h_64,c_fill' })" alt="" />
          <code>{{ field.path }}</code>
          <button type="button" :disabled="busy" @click="replaceImageAt(field.path)">更换图片</button>
        </div>
      </div>
      <p v-else-if="content" class="hint">当前文件里没有识别到图片字段（形如 {publicId, version, format} 的对象）。</p>

      <textarea v-model="content" spellcheck="false" placeholder="加载后编辑 JSON 内容" @blur="scanImageFields"></textarea>

      <details class="advanced">
        <summary>高级：在新的字段路径插入图片</summary>
        <p class="advanced-hint">仅用于当前字段还不存在的情况，比如刚新增了一个项目、但还没有 image 字段。日常更换图片请用上面扫描出来的列表。</p>
        <div class="advanced-row">
          <input v-model="newImagePath" placeholder="例如 projects.2.image（还不存在的字段）" />
          <button type="button" :disabled="busy || !newImagePath.trim()" @click="addImageAt">打开媒体库并插入</button>
        </div>
      </details>

      <button class="commit" :disabled="busy || !content" @click="save">{{ useLocal ? '保存到本地 JSON' : 'Commit & Deploy' }}</button>
    </section>
  </main>
</template>

<style scoped>
.admin-page{width:min(1100px,calc(100% - 48px));margin:0 auto;padding:60px 0;font-family:Manrope,"Noto Sans SC",sans-serif}
.admin-page header{border-bottom:1px solid #d7d5cf;padding-bottom:22px}
.admin-page h1{font-size:38px;letter-spacing:-.06em;margin:0}
.admin-page aside{margin:22px 0;background:#fff1dc;padding:16px 18px;font-size:13px;line-height:1.6}
.mode-switch{font-size:13px;margin:12px 0}
.config{display:grid;grid-template-columns:2fr 1fr 100px auto auto auto;gap:12px;align-items:end}
.config label{font-size:11px;font-weight:700;text-transform:uppercase;color:#727272}
.config input,.editor select{display:block;width:100%;margin-top:6px;background:#fff;border:1px solid #d7d5cf;padding:11px;font:13px "DM Mono",monospace}
.config button,.commit,.local-actions button{border:0;background:#1f2328;color:#fff;padding:12px 16px;font-weight:700;cursor:pointer}
.config .secondary{background:#777}
.config .ghost,.local-actions .ghost{background:#fff;color:#1f2328;border:1px solid #d7d5cf}
.local-actions{margin-bottom:12px;display:flex;gap:10px}
.status{font-size:13px}
.editor{border:1px solid #d7d5cf;background:#fff}
.editor-bar{display:flex;justify-content:space-between;gap:12px;padding:12px;border-bottom:1px solid #d7d5cf;flex-wrap:wrap}
.editor-bar select{width:auto;flex:1;min-width:200px}
.ghost{border:1px solid #d7d5cf;background:#fff;color:#1f2328;padding:11px 14px;font-weight:700;cursor:pointer;white-space:nowrap}
.image-fields{display:flex;flex-wrap:wrap;gap:10px;padding:14px 16px;border-bottom:1px solid #d7d5cf;background:#faf9f6}
.image-field{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #d7d5cf;padding:6px 10px 6px 6px}
.image-field img{width:36px;height:36px;object-fit:cover;background:#eae8e1}
.image-field code{font:12px "DM Mono",monospace;color:#454545}
.image-field button{border:0;background:#1f2328;color:#fff;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer}
.hint{padding:12px 16px;font-size:13px;color:#727272;border-bottom:1px solid #d7d5cf}
.editor textarea{width:100%;height:480px;border:0;resize:vertical;padding:20px;font:13px/1.6 "DM Mono",monospace;outline:0}
.advanced{border-top:1px solid #d7d5cf;padding:12px 16px;font-size:13px}
.advanced summary{cursor:pointer;color:#727272;font-weight:700}
.advanced-hint{font-size:12px;color:#8a8a8a;margin:8px 0 0}
.advanced-row{display:flex;gap:10px;margin-top:10px}
.advanced-row input{flex:1;border:1px solid #d7d5cf;padding:9px;font:13px "DM Mono",monospace}
.advanced-row button{border:0;background:#1f2328;color:#fff;padding:9px 14px;font-weight:700;cursor:pointer;white-space:nowrap}
.commit{margin:12px;background:#ff5a36}
@media(max-width:700px){
  .admin-page{width:calc(100% - 32px);padding-top:35px}
  .config{grid-template-columns:1fr}
  .editor textarea{height:400px}
  .editor-bar{align-items:stretch;flex-direction:column}
}
</style>
