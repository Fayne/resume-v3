import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { localContentEditor } from './server/localContentEditor.js'

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
