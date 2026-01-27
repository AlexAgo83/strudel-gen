## req_002_poc3_baseline_from_poc2 - POC3 baseline from POC2
> From version: 0.1.0
> Understanding: 85%
> Confidence: 75%

# Needs
- Create a new `poc3/` that starts as a faithful copy of the current `poc2/` behavior and UX (prompt → response, Ollama status, local proxy, Markdown rendering).
- Freeze `poc2/`: all future prototype changes must be implemented in `poc3/` only.
- Keep `poc3/` local-first:
  - Works offline once Ollama + model are installed locally.
  - Uses `/ollama/*` proxying to avoid CORS in dev and in built mode.
- Ensure `poc3/` can evolve independently (separate package name, README, and logs).

# Context
- Motivation: `poc2/` was built iteratively in the Codex chat; we want a clean “next iteration” space without rewriting history or destabilizing `poc2/`.
- `poc2/` current baseline includes:
  - Vite + React UI with prompt input and response area.
  - Ollama health check (`/api/version`) and disabled “Send” when unreachable.
  - Calls Ollama chat API (`/api/chat`, non-streaming).
  - Response rendered as Markdown (GFM).
  - Dev proxy via Vite and built proxy via `server.mjs`.
- Non-goals for this request:
  - Adding new features (those will be separate follow-up requests on top of `poc3/`).
  - Changing `poc2/` behavior or dependencies.
