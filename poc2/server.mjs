import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import dotenv from 'dotenv'
import { createProxyMiddleware } from 'http-proxy-middleware'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const distDir = path.join(process.cwd(), 'dist')
if (!fs.existsSync(distDir)) {
  // eslint-disable-next-line no-console
  console.error('Missing dist/. Run `npm run build` first.')
  process.exit(1)
}

const target = process.env.VITE_OLLAMA_HOST || 'http://localhost:11434'
const port = Number(process.env.PORT || '') || 4173

const app = express()

app.use(
  '/ollama',
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { '^/ollama': '' },
  }),
)

app.use(express.static(distDir))

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`POC2 server running on http://localhost:${port} (proxy -> ${target})`)
})
