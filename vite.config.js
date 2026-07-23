import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const contentFiles = new Set([
  'src/data/profile.json',
  'src/data/skills.json',
  'src/data/projects.json',
  'src/data/timeline.json',
])

function localContentEditor() {
  return {
    name: 'local-content-editor',
    configureServer(server) {
      server.middlewares.use('/__portfolio-admin/content', async (request, response) => {
        const url = new URL(request.url, 'http://localhost')
        const file = url.searchParams.get('file')
        if (!file || !contentFiles.has(file)) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: 'Unsupported content file.' }))
          return
        }

        const absolutePath = resolve(server.config.root, file)
        response.setHeader('Content-Type', 'application/json')
        if (request.method === 'GET') {
          response.end(await readFile(absolutePath, 'utf8'))
          return
        }
        if (request.method !== 'PUT') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }

        let body = ''
        request.on('data', (chunk) => { body += chunk })
        request.on('end', async () => {
          try {
            const content = JSON.parse(body)
            await writeFile(absolutePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
            response.end(JSON.stringify({ ok: true }))
          } catch {
            response.statusCode = 400
            response.end(JSON.stringify({ error: 'Invalid JSON.' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [vue(), localContentEditor()],
  build: {
    outDir: mode === 'admin' ? 'dist-admin' : 'dist',
    rollupOptions: { input: mode === 'admin' ? 'admin.html' : 'index.html' },
  },
}))
