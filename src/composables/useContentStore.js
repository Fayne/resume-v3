import { commitContentFile, fetchContentFile } from './useGithubApi'
import { validateContentFile } from './useContentValidation'

async function parseErrorResponse(response, fallbackMessage) {
  try {
    const data = await response.json()
    const detailText = Array.isArray(data.details) && data.details.length
      ? `\n${data.details.map((item) => `- ${item.path}: ${item.message}`).join('\n')}`
      : ''
    throw new Error(`${data.error || fallbackMessage}${detailText}`)
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(fallbackMessage)
    throw error
  }
}

export async function loadContent({ useLocal, config, path }) {
  if (useLocal) {
    const response = await fetch(`/__portfolio-admin/content?file=${encodeURIComponent(path)}`)
    if (!response.ok) await parseErrorResponse(response, '本地内容接口不可用。')
    return { content: await response.json(), sha: '' }
  }
  return fetchContentFile({ ...config, path })
}

export async function saveContent({ useLocal, config, path, content, sha }) {
  const validation = validateContentFile(path, content)
  if (!validation.valid) {
    throw new Error(validation.errors.map((item) => `${item.path}: ${item.message}`).join('\n'))
  }

  if (useLocal) {
    const response = await fetch(`/__portfolio-admin/content?file=${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    if (!response.ok) await parseErrorResponse(response, '无法写入本地文件。')
    return { sha: '' }
  }

  await commitContentFile({ ...config, path, content, sha })
  return { sha }
}
