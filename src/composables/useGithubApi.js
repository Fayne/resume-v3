import { Octokit } from '@octokit/rest'

const TOKEN_KEY = 'resume-site-gh-token'
const REPO_KEY = 'resume-site-gh-repo'
const BRANCH_KEY = 'resume-site-gh-branch'
const DATA_PATH = 'src/data/resume.json'

export function getSavedConfig() {
  return {
    token: localStorage.getItem(TOKEN_KEY) || '',
    repo: localStorage.getItem(REPO_KEY) || '',
    branch: localStorage.getItem(BRANCH_KEY) || 'main',
  }
}

export function saveConfig({ token, repo, branch }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REPO_KEY, repo)
  localStorage.setItem(BRANCH_KEY, branch || 'main')
}

export function clearConfig() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REPO_KEY)
  localStorage.removeItem(BRANCH_KEY)
}

function getOctokit(token) {
  return new Octokit({ auth: token })
}

function parseRepo(repo) {
  const [owner, name] = repo.split('/')
  if (!owner || !name) {
    throw new Error('仓库格式应为 owner/repo，例如 zhangsan/resume-site')
  }
  return { owner, name }
}

/**
 * 从 GitHub 拉取 resume.json 的当前内容和 sha（更新时必须带上 sha）
 */
export async function fetchResumeFile({ token, repo, branch }) {
  const octokit = getOctokit(token)
  const { owner, name } = parseRepo(repo)

  const { data } = await octokit.repos.getContent({
    owner,
    repo: name,
    path: DATA_PATH,
    ref: branch || 'main',
  })

  const content = JSON.parse(decodeBase64(data.content))
  return { content, sha: data.sha }
}

/**
 * 提交新的 resume.json 内容，触发一次 Git commit
 * Cloudflare Pages 监听到 push 后会自动重新构建部署
 */
export async function commitResumeFile({ token, repo, branch, content, sha, message }) {
  const octokit = getOctokit(token)
  const { owner, name } = parseRepo(repo)

  const encoded = encodeBase64(JSON.stringify(content, null, 2))

  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo: name,
    path: DATA_PATH,
    message: message || 'chore: update resume content via admin panel',
    content: encoded,
    sha,
    branch: branch || 'main',
  })

  return data.commit
}

function decodeBase64(str) {
  // GitHub 返回的 base64 内容可能带换行符
  const clean = str.replace(/\n/g, '')
  return decodeURIComponent(escape(atob(clean)))
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)))
}
