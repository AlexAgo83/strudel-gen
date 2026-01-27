# POC2 — Prompt → response (Ollama, local-first)
[Scope: local prototype | Audience: developers | Related: `logics/request/req_001_poc2_prompt_to_response_ollama.md`, `logics/backlog/item_001_poc2_prompt_to_response_ollama.md`, `logics/tasks/task_001_poc2_prompt_to_response_ollama.md`]

## Objective
Provide a minimal local-first web UI to send a prompt to Ollama (chat API) and display the assistant response for fast iteration and debugging, without Strudel integration.

## Scope (in/out)
- (in) Single-page UI: prompt input + send, busy state, error display.
- (in) Connectivity indicator: ping `/api/version` and show “Ollama OK (vX.Y.Z)” when reachable.
- (in) Response rendering as Markdown (GFM) for readability (lists, links, code blocks).
- (in) Local proxying to avoid CORS:
  - Dev: Vite proxy `/ollama/*` → `VITE_OLLAMA_HOST`.
  - Build: tiny Node server serving `dist/` and proxying `/ollama/*` → `VITE_OLLAMA_HOST`.
- (in) Minimal actions: clear prompt, clear response, copy response.
- (out) Strudel playback/editor, guardrails, history, share links.
- (out) Streaming responses and multi-turn chat.
- (out) Remote deployment with secrets (this is intentionally local-only).

## Functional rules
- Configuration
  - `VITE_OLLAMA_HOST` (default: `http://localhost:11434`)
  - `VITE_OLLAMA_MODEL` (default: `qwen3`)
  - Optional: `VITE_DISABLE_HMR=1` to disable Vite HMR if WebSockets are blocked.
- Request contract
  - Call `POST /ollama/api/chat` with `stream: false` and `messages: [{ role: "user", content: prompt }]`.
  - Use `options.temperature = 0.6` (prototype tuning).
- UX rules
  - Disable “Send” when busy or when Ollama is unreachable.
  - Clear response when starting a new request (avoid mixing outputs).
  - Surface any non-2xx response as a readable error (include status + body when available).
  - Provide “Copy response” (disabled when empty) and “Clear response”.
- Markdown rendering
  - Render response content as Markdown, with GFM enabled (tables, strikethrough, task lists).
  - Code blocks must be readable and scroll when long (no syntax highlighting required).

## Target UX
- Header shows:
  - Title (“POC2 — Prompt → response”)
  - Model pill (“Model: qwen3”)
  - Ollama status pill (“Ollama OK (vX.Y.Z)” or an error message)
- Main content:
  - Prompt card (textarea + Send + Clear prompt)
  - Response card (Markdown-rendered output + Copy + Clear response)

## Data / technical notes
- Networking model
  - Browser calls `/ollama/*` on the local dev/build server.
  - Dev server proxy and built server proxy forward to `VITE_OLLAMA_HOST`.
- Local-only secret note
  - Any `VITE_*` env var is bundled into frontend assets. Do not use `VITE_OLLAMA_API_KEY` outside local prototyping.
  - If a secret is required in the future, move auth to `server.mjs` and keep it out of the browser bundle.

## Tests & QA
- Setup
  - `ollama pull qwen3`
  - `curl http://localhost:11434/api/version`
- Dev smoke
  - `cd poc2 && npm run dev`
  - Verify: status pill OK → send prompt → Markdown renders (lists + code block) → copy works.
- Build smoke
  - `cd poc2 && npm run build && npm run start`
  - Verify the same behavior via the built server.
- Repo checks
  - `cd poc2 && npm run lint`

## Risks / open questions
- Response size/perf: very large outputs can impact the UI (consider max size + truncation later).
- Security hardening: Markdown rendering is safer than `dangerouslySetInnerHTML`, but links/navigation behavior may need constraints if deployed.
- Feature creep: keep POC2 scoped to “prompt → response” to avoid duplicating POC1 work.
