# POC2 — Prompt → response (local)

Minimal local-only UI that sends a prompt to Ollama and shows the raw response (no Strudel integration yet).

## Requirements

- Node.js + npm
- Ollama running locally (default: `http://localhost:11434`)

## Ollama setup (Mac)

```bash
brew install ollama
brew services start ollama
ollama pull qwen3
curl http://localhost:11434/api/version
```

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Run (built, still local)

This uses a tiny local Node server that serves `dist/` and proxies `/ollama/*` → `VITE_OLLAMA_HOST` (no CORS issues).

```bash
cp .env.example .env.local
npm install
npm run build
npm run start
```

## Config

- `VITE_OLLAMA_HOST`: Ollama base URL (default: `http://localhost:11434`)
- `VITE_OLLAMA_MODEL`: model name (default: `qwen3`)
- `VITE_OLLAMA_API_KEY`: optional; if set, it is bundled into the frontend build (local-only)
- `VITE_DISABLE_HMR`: set to `1` to disable Vite HMR if your environment blocks WebSockets

The Vite dev server proxies `/ollama/*` → `VITE_OLLAMA_HOST` to avoid CORS issues during local prototyping.
