## req_001_poc2_prompt_to_response_ollama - POC2 prompt to response (Ollama)
> From version: 0.1.0
> Understanding: 95%
> Confidence: 90%

# Needs
- Provide a minimal local UI to send a prompt to Ollama (chat API) and display the assistant response (no Strudel integration yet).
- Keep the prototype local-first (no Internet required once the model is pulled) when `VITE_OLLAMA_HOST` targets localhost.
- Avoid CORS issues via a local proxy in dev, and keep a similar experience for a built version.
- Provide basic UX for a tight loop: prompt textarea, send/disabled state, clear actions, copy response.
- Provide clear connectivity feedback (Ollama ping/version) and user-facing errors when Ollama is unreachable.
- Render responses as Markdown (GFM) for readability (lists, code blocks, links).

# Context
- This request is implemented as `poc2/` (Vite + React).
- Local AI stack: Ollama (default `http://localhost:11434`) using a lightweight model (default `qwen3`).
- Networking:
  - Dev: Vite proxies `/ollama/*` → `VITE_OLLAMA_HOST` to avoid browser CORS.
  - Built (still local): `poc2/server.mjs` serves `dist/` and proxies `/ollama/*` → `VITE_OLLAMA_HOST`.
- Configuration (local-only): `poc2/.env.example` / `poc2/.env.local`:
  - `VITE_OLLAMA_HOST`, `VITE_OLLAMA_MODEL`, optional `VITE_OLLAMA_API_KEY`, optional `VITE_DISABLE_HMR`.
- Security note: anything in `VITE_*` is bundled into the frontend build; `VITE_OLLAMA_API_KEY` must be treated as local-only.
- Current limitations (explicitly acceptable for this POC): no streaming, no chat history, no retry/repair logic, no Strudel playback.
