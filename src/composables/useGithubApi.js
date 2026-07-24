import { Octokit } from '@octokit/rest'
import { CONTENT_FILES } from '../content/contentFiles'

const TOKEN_KEY = 'portfolio-gh-token'
const REPO_KEY = 'portfolio-gh-repo'
const BRANCH_KEY = 'portfolio-gh-branch'

export function getSavedConfig() { return { token: sessionStorage.getItem(TOKEN_KEY) || '', repo: sessionStorage.getItem(REPO_KEY) || '', branch: sessionStorage.getItem(BRANCH_KEY) || 'main' } }
export function saveConfig({ token, repo, branch }) { sessionStorage.setItem(TOKEN_KEY, token); sessionStorage.setItem(REPO_KEY, repo); sessionStorage.setItem(BRANCH_KEY, branch || 'main') }
export function clearConfig() { [TOKEN_KEY, REPO_KEY, BRANCH_KEY].forEach((key) => sessionStorage.removeItem(key)) }
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
  const { owner, name } = parseRepo(repo)
  const { data } = await new Octokit({ auth: token }).repos.getContent({ owner, repo: name, path, ref: branch || 'main' })
  return { content: JSON.parse(decode(data.content)), sha: data.sha }
}
export async function commitContentFile({ token, repo, branch, path, content, sha }) {
  const { owner, name } = parseRepo(repo)
  return new Octokit({ auth: token }).repos.createOrUpdateFileContents({ owner, repo: name, path, message: `content: update ${path}`, content: encode(JSON.stringify(content, null, 2)), sha, branch: branch || 'master' })
}
