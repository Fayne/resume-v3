import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CONTENT_FILE_SET } from '../src/content/contentFiles.js'
import { validateContentFile } from '../src/composables/useContentValidation.js'

function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

async function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => resolveBody(body))
    request.on('error', rejectBody)
  })
}

export function localContentEditor() {
  return {
    name: 'local-content-editor',
    configureServer(server) {
      server.middlewares.use('/__portfolio-admin/content', async (request, response) => {
        const url = new URL(request.url, 'http://localhost')
        const file = url.searchParams.get('file')

        if (!file || !CONTENT_FILE_SET.has(file)) {
          sendJson(response, 400, { error: 'Unsupported content file.' })
          return
        }

        const absolutePath = resolve(server.config.root, file)

        if (request.method === 'GET') {
          try {
            const raw = await readFile(absolutePath, 'utf8')
            response.setHeader('Content-Type', 'application/json')
            response.end(raw)
          } catch (error) {
            sendJson(response, 404, { error: `Unable to read content file: ${error.message}` })
          }
          return
        }

        if (request.method !== 'PUT') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }

        try {
          const body = await readRequestBody(request)
          const content = JSON.parse(body)
          const validation = validateContentFile(file, content)
          if (!validation.valid) {
            sendJson(response, 400, { error: 'Validation failed.', details: validation.errors })
            return
          }

          await writeFile(absolutePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
          sendJson(response, 200, { ok: true })
        } catch (error) {
          sendJson(response, 400, { error: `Invalid content payload: ${error.message}` })
        }
      })
    },
  }
}
