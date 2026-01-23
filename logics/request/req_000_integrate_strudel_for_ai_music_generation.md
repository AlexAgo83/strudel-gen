## req_000_integrate_strudel_for_ai_music_generation - Integrate Strudel for AI music generation
> From version: 0.1.0
> Understanding: 85%
> Confidence: 70%

# Needs
- Embed Strudel (live coding music) into the product to play/generate tracks from code.
- Add an “AI music generation” flow that outputs valid Strudel code from a short prompt + constraints (mood, tempo, genre, length, instruments).
- Let users preview the result, iterate (regenerate / edit), and keep a history of generations.
- Enable sharing/export of a generated track (at least the Strudel code + parameters; audio export can be a later step).

# Context
- Target audience: absolute beginners (no music knowledge). The UI must work with sensible defaults and avoid jargon.
- Platform: web app (browser/WebAudio). Prioritize a fast prototype with minimal backend dependencies.
- AI: local-first prototype using Ollama (chat API) with a lightweight Qwen model; no dedicated backend/API initially.
- Guardrails: AI output is untrusted. Execution must be sandboxed and restricted to a safe Strudel subset (no arbitrary JS execution).
- Prototype implementation: `web/` (Vite+React), direct Strudel integration via `@strudel/web`, dev proxy to Ollama to avoid CORS in local.
- Key product questions to decide early:
  - Expected generation time budget and cost constraints (model/provider).
  - Default loop length (bars) and default tempo.
  - Allowed style presets and sound palette for beginners.
  - Sharing mode for v1: copy only vs shareable URL vs persisted public link.
  - Whether manual code editing is exposed (and when).
