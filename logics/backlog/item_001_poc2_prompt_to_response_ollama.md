## item_001_poc2_prompt_to_response_ollama - POC2 prompt to response (Ollama)
> From version: 0.1.0
> Understanding: 95%
> Confidence: 90%
> Progress: 100%

# Problem
We need a minimal local-first UI to validate the “prompt → LLM response” loop against Ollama before integrating Strudel playback (separating concerns from `poc1/`).

Promoted from `logics/request/req_001_poc2_prompt_to_response_ollama.md`.

# Scope
- In:
  - Local Vite + React UI with a prompt textarea and a “Send” action.
  - Display LLM output as rendered Markdown (GFM).
  - Local proxy setup to avoid CORS:
    - Dev: Vite proxy `/ollama/*` → `VITE_OLLAMA_HOST`.
    - Build: tiny Node server that serves `dist/` and proxies `/ollama/*` → `VITE_OLLAMA_HOST`.
  - Basic UX: Ollama connectivity status (ping/version), errors, busy state, clear prompt/response, copy response.
  - Local configuration via `.env.local` using `VITE_OLLAMA_HOST`, `VITE_OLLAMA_MODEL`, optional `VITE_DISABLE_HMR`.
- Out:
  - Strudel integration (playback, editor, generation guardrails).
  - Streaming responses, multi-turn chat history, retries/repair.
  - Any deployed/shared environment requiring secret handling (this POC is local-only).

# Acceptance criteria
- When Ollama is reachable, the UI shows “Ollama OK (vX.Y.Z)” and enables “Send”.
- Given a prompt, the app calls Ollama via `/ollama/api/chat` and renders the returned content as Markdown (including code blocks and lists).
- When Ollama is unreachable or returns an error, the UI surfaces a clear error message (no crash).
- Users can clear the prompt, clear the response, and copy the response to clipboard.
- Dev proxy and built server proxy both work with `VITE_OLLAMA_HOST=http://localhost:11434`.

# Priority
- Impact: Medium (unblocks fast iteration and debugging of the LLM loop).
- Urgency: Medium (useful prerequisite before expanding POC1 features).

# Notes
- Code location: `poc2/`.
- Security note: anything in `VITE_*` is bundled into frontend assets; do not use `VITE_OLLAMA_API_KEY` outside local prototyping.
