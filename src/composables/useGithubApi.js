import { Octokit } from '@octokit/rest'

const TOKEN_KEY = 'portfolio-gh-token'
const REPO_KEY = 'portfolio-gh-repo'
const BRANCH_KEY = 'portfolio-gh-branch'
export const CONTENT_FILES = ['src/data/profile.json', 'src/data/skills.json', 'src/data/projects.json', 'src/data/timeline.json']

export function getSavedConfig() { return { token: sessionStorage.getItem(TOKEN_KEY) || '', repo: sessionStorage.getItem(REPO_KEY) || '', branch: sessionStorage.getItem(BRANCH_KEY) || 'main' } }
export function saveConfig({ token, repo, branch }) { sessionStorage.setItem(TOKEN_KEY, token); sessionStorage.setItem(REPO_KEY, repo); sessionStorage.setItem(BRANCH_KEY, branch || 'main') }
export function clearConfig() { [TOKEN_KEY, REPO_KEY, BRANCH_KEY].forEach((key) => sessionStorage.removeItem(key)) }
function parseRepo(repo) { const [owner, name] = repo.split('/'); if (!owner || !name) throw new Error('仓库格式应为 owner/repo'); return { owner, name } }
function decode(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, '')))) }
function encode(str) { return btoa(unescape(encodeURIComponent(str))) }

export async function fetchContentFile({ token, repo, branch, path }) {
  const { owner, name } = parseRepo(repo)
  const { data } = await new Octokit({ auth: token }).repos.getContent({ owner, repo: name, path, ref: branch || 'main' })
  return { content: JSON.parse(decode(data.content)), sha: data.sha }
}
export async function commitContentFile({ token, repo, branch, path, content, sha }) {
  const { owner, name } = parseRepo(repo)
  return new Octokit({ auth: token }).repos.createOrUpdateFileContents({ owner, repo: name, path, message: `content: update ${path}`, content: encode(JSON.stringify(content, null, 2)), sha, branch: branch || 'main' })
}
