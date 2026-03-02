import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(process.cwd(), 'dist')
const indexFile = resolve(distDir, 'index.html')
const fallbackFile = resolve(distDir, '404.html')

if (!existsSync(indexFile)) {
  console.error('dist/index.html was not found. Run "npm run build" first.')
  process.exit(1)
}

copyFileSync(indexFile, fallbackFile)
console.log('Created dist/404.html for SPA fallback routes.')
