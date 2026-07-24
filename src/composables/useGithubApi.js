import { Octokit } from '@octokit/rest'

const TOKEN_KEY = 'portfolio-gh-token'
const REPO_KEY = 'portfolio-gh-repo'
const BRANCH_KEY = 'portfolio-gh-branch'

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

function buildGithubError(error, fallbackMessage) {
  const wrapped = new Error(error?.response?.data?.message || error?.message || fallbackMessage)
  wrapped.status = error?.status
  wrapped.shouldClearConfig = [401, 403, 404].includes(error?.status)
  return wrapped
}

export function getSavedConfig() {
  const storage = getStorage()
  return {
    token: storage?.getItem(TOKEN_KEY) || '',
    repo: storage?.getItem(REPO_KEY) || '',
    branch: storage?.getItem(BRANCH_KEY) || 'master',
  }
}

export function saveConfig({ token, repo, branch }) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(REPO_KEY, repo)
  storage.setItem(BRANCH_KEY, branch || 'master')
}

export function clearConfig() {
  const storage = getStorage()
  if (!storage) return
  ;[TOKEN_KEY, REPO_KEY, BRANCH_KEY].forEach((key) => storage.removeItem(key))
}
// 兼容几种常见的粘贴格式：owner/repo、SSH 地址、HTTPS 地址（带或不带 .git 后缀）
function parseRepo(input) {
  const trimmed = (input || '').trim()

  const sshMatch = trimmed.match(/^git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/)
  if (sshMatch) return { owner: sshMatch[1], name: sshMatch[2] }

  const httpsMatch = trimmed.match(/^https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/)
  if (httpsMatch) return { owner: httpsMatch[1], name: httpsMatch[2] }

  const parts = trimmed.replace(/\.git$/, '').split('/').filter(Boolean)
  if (parts.length !== 2) {
    throw new Error('仓库格式应为 owner/repo，例如 Fayne/resume-v3（不用粘贴完整的 git 地址）')
  }
  return { owner: parts[0], name: parts[1] }
}
function decode(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, '')))) }
function encode(str) { return btoa(unescape(encodeURIComponent(str))) }

export async function fetchContentFile({ token, repo, branch, path }) {
  try {
    const { owner, name } = parseRepo(repo)
    const { data } = await new Octokit({ auth: token }).repos.getContent({ owner, repo: name, path, ref: branch || 'master' })
    return { content: JSON.parse(decode(data.content)), sha: data.sha }
  } catch (error) {
    throw buildGithubError(error, '无法读取 GitHub 内容。')
  }
}

export async function commitContentFile({ token, repo, branch, path, content, sha }) {
  try {
    const { owner, name } = parseRepo(repo)
    return await new Octokit({ auth: token }).repos.createOrUpdateFileContents({
      owner,
      repo: name,
      path,
      message: `content: update ${path}`,
      content: encode(JSON.stringify(content, null, 2)),
      sha,
      branch: branch || 'master',
    })
  } catch (error) {
    throw buildGithubError(error, '无法提交 GitHub 内容。')
  }
}
