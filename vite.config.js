import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, renameSync } from 'node:fs'
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

// admin 构建的入口文件叫 admin.html（源文件），但部署到独立域名后，
// 根路径 / 需要能直接命中 index.html，所以构建产物写盘完成后把它改名。
// 只影响 dist-admin 目录里的产物，不动仓库根目录的 admin.html 源文件。
function renameEntryToIndex(fromFile, toFile) {
  return {
    name: 'rename-entry-to-index',
    writeBundle(options) {
      const from = resolve(options.dir, fromFile)
      const to = resolve(options.dir, toFile)
      if (existsSync(from)) {
        renameSync(from, to)
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    localContentEditor(),
    ...(mode === 'admin' ? [renameEntryToIndex('admin.html', 'index.html')] : []),
  ],
  build: {
    outDir: mode === 'admin' ? 'dist-admin' : 'dist',
    rollupOptions: { input: mode === 'admin' ? 'admin.html' : 'index.html' },
  },
}))
