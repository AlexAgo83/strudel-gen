import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_OLLAMA_HOST || 'http://localhost:11434'
  const disableHmr = env.VITE_DISABLE_HMR === '1'

  return {
    plugins: [react()],
    server: {
      hmr: disableHmr
        ? false
        : {
            protocol: 'ws',
            host: env.VITE_HMR_HOST || undefined,
            port: Number(env.VITE_HMR_PORT || '') || undefined,
            clientPort: Number(env.VITE_HMR_CLIENT_PORT || '') || undefined,
          },
      proxy: {
        '/ollama': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama/, ''),
        },
      },
    },
  }
})
