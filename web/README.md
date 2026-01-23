# Strudel Gen (local) — web prototype

Local-only prototype that generates Strudel code via Ollama and plays it in the browser via `@strudel/web`.

## Requirements

- Node.js + npm
- Ollama running locally (default: `http://localhost:11434`)

## Ollama setup (Mac)

```bash
brew install ollama
brew services start ollama
ollama pull qwen2.5:1.5b
curl http://localhost:11434/api/version
```

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Config

- `VITE_OLLAMA_HOST`: Ollama base URL (default: `http://localhost:11434`)
- `VITE_OLLAMA_MODEL`: model name (default: `qwen2.5:1.5b`)
- `VITE_OLLAMA_API_KEY`: optional; if set, it is bundled into the frontend build (local-only)
- `VITE_DISABLE_HMR`: set to `1` to disable Vite HMR if your environment blocks WebSockets

The Vite dev server proxies `/ollama/*` → `VITE_OLLAMA_HOST` to avoid CORS issues during local prototyping.
