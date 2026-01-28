import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'POC3',
          short_name: 'POC3',
          description: 'Minimal local-only UI that sends a prompt to Ollama and renders the response.',
          theme_color: '#0b0f17',
          background_color: '#0b0f17',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          // Never cache Ollama proxy calls (local model responses can be large and are not useful offline).
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/ollama/'),
              handler: 'NetworkOnly',
              method: 'GET',
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/ollama/'),
              handler: 'NetworkOnly',
              method: 'POST',
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
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
