import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_OLLAMA_HOST || 'http://127.0.0.1:11434'
  const disableHmr = env.VITE_DISABLE_HMR === '1'

  return {
    define: {
      __APP_NAME__: JSON.stringify(process.env.npm_package_name || 'poc3'),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    },
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
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Ollama may 403 when the browser's Origin is a LAN URL (e.g. http://192.168.x.x:5173).
              // Since we proxy same-origin through Vite, we can safely drop Origin.
              proxyReq.removeHeader('origin')
            })
          },
          rewrite: (path) => path.replace(/^\/ollama/, ''),
        },
      },
    },
  }
})
