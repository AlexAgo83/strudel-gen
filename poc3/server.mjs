import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import dotenv from 'dotenv'
import { createProxyMiddleware } from 'http-proxy-middleware'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const distDir = path.join(process.cwd(), 'dist')
if (!fs.existsSync(distDir)) {
  console.error('Missing dist/. Run `npm run build` first.')
  process.exit(1)
}

const target = process.env.VITE_OLLAMA_HOST || 'http://127.0.0.1:11434'
const port = Number(process.env.PORT || '') || 4173

const app = express()

app.use(
  '/ollama',
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { '^/ollama': '' },
    on: {
      proxyReq(proxyReq) {
        // Same reason as Vite dev proxy: Ollama can reject non-local Origins with 403.
        proxyReq.removeHeader('origin')
      },
    },
  }),
)

app.use(express.static(distDir))

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`POC3 server running on http://localhost:${port} (proxy -> ${target})`)
})
