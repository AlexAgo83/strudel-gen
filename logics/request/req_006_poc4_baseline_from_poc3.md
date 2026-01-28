## req_006_poc4_baseline_from_poc3 - POC4 baseline from POC3
> From version: 0.1.0
> Understanding: 80
> Confidence: 70

# Needs
- Create a new `poc4/` that starts as a faithful copy of the current `poc3/` behavior and UX (prompt → response, Ollama status, local proxy, Markdown rendering, streaming + history if already in POC3).
- Freeze `poc3/`: all future prototype changes must be implemented in `poc4/` only.
- Keep `poc4/` local-first:
  - Works offline once Ollama + model are installed locally.
  - Uses `/ollama/*` proxying to avoid CORS in dev and in built mode.
- Ensure `poc4/` can evolve independently (separate package name, README, and logs).

# Context
- Motivation: we want a clean “next iteration” space without rewriting history or destabilizing `poc3/`.
- `poc3/` current baseline includes:
  - Vite + React UI with prompt input and response area.
  - Ollama health check (`/api/version`) and disabled “Send” when unreachable.
  - Calls Ollama chat API (`/api/chat`, streaming).
  - Response rendered as Markdown (GFM).
  - Dev proxy via Vite and built proxy via `server.mjs`.
- Non-goals for this request:
  - Adding new features (those will be separate follow-up requests on top of `poc4/`).
  - Changing `poc3/` behavior or dependencies.
