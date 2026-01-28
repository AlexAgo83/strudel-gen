# POC3 — Prompt → response (local)

Minimal local-only UI that sends a prompt to Ollama and renders the response as Markdown (no Strudel integration yet).

## Requirements

- Node.js + npm
- Ollama running locally (default: `http://127.0.0.1:11434`)

## Ollama setup (Mac)

```bash
brew install ollama
brew services start ollama
ollama pull qwen3
curl http://127.0.0.1:11434/api/version
```

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Run (LAN)

Expose the dev server to your local network:

```bash
cp .env.example .env.local
npm install
npm run dev:lan
```

Notes:
- Keep `VITE_OLLAMA_HOST` pointing to your local Ollama (`http://127.0.0.1:11434`) so the proxy can reach it from the same machine.
- If another device can load the page but `/ollama/api/*` fails, ensure your macOS firewall allows incoming connections to Node/Vite.

## Run (built, still local)

This uses a tiny local Node server that serves `dist/` and proxies `/ollama/*` → `VITE_OLLAMA_HOST` (no CORS issues).

```bash
cp .env.example .env.local
npm install
npm run build
npm run start
```

## PWA

- The app is a PWA (manifest + service worker). In Chrome/Edge you can install it from the address bar (“Install app”).
- Service workers require a secure context: they work on `http://localhost` / `http://127.0.0.1`, but not on plain `http://192.168.x.x` (use HTTPS if you want install/offline on a LAN URL).

## Config

- `VITE_OLLAMA_HOST`: Ollama base URL (default: `http://127.0.0.1:11434`)
- `VITE_OLLAMA_MODEL`: model name (default: `qwen3`)
- `VITE_OLLAMA_API_KEY`: optional; if set, it is bundled into the frontend build (local-only)
- `VITE_DISABLE_HMR`: set to `1` to disable Vite HMR if your environment blocks WebSockets

The Vite dev server proxies `/ollama/*` → `VITE_OLLAMA_HOST` to avoid CORS issues during local prototyping.
