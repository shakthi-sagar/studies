import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredBase = env.VITE_BASE_PATH?.trim()

  return {
    base: configuredBase && configuredBase.length > 0 ? configuredBase : '/',
    plugins: [react()],
  }
})
