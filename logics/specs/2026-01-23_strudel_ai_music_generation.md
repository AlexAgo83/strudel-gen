# AI Music Generation with Strudel — generate, preview, iterate
[Scope: v1 (fast web prototype) | Audience: absolute beginners | Related: `logics/request/req_000_integrate_strudel_for_ai_music_generation.md`, `logics/backlog/item_000_ai_generated_music_with_strudel_generate_preview.md`]

## Objective
Enable absolute beginners to generate short musical loops from a natural-language prompt by producing valid Strudel code, then preview and iterate on the result directly inside the product (web app).

## Scope (in/out)
- (in) Prompt + beginner-friendly constraints input (BPM/speed, length, style preset, variation/complexity).
- (in) AI generation that returns Strudel code + basic metadata (BPM, title, optional notes).
- (in) In-app Strudel player (play/stop) and code view (advanced).
- (in) Regenerate/iterate workflow and local history (localStorage).
- (in) Safety/validation to prevent non-Strudel output and reduce JS injection risk.
- (out) WAV export, stems, mastering.
- (out) MIDI export (unless trivially supported by the chosen Strudel runtime).
- (out) Collaboration/multiplayer live coding.

## Functional rules
- Generation inputs (v1 recommendations for beginners)
  - Fields (all optional):
    - `Prompt` (free text) + example “chips” + a “Surprise me” shortcut.
    - `Speed (BPM)` slider: min 60, max 160, default 120.
    - `Length` selector (bars): 4 / 8 / 16 (default 8).
    - `Style` preset (closed list): `lofi`, `techno`, `hiphop`, `ambient`, `pop`, `cinematic` (default `lofi`).
    - `Variation` (aka complexity): `simple` / `balanced` / `busy` (default `balanced`).
  - UI labels should avoid jargon; show helper text (e.g., “Speed = how fast it feels”).
- Generation outputs
  - The AI response must be treated as untrusted input.
  - The system stores and displays:
    - Strudel code (the primary artifact).
    - The effective constraints used.
    - Generation timestamp and status (success/error).
- Validation and guardrails
  - Contract: the model must return a strict JSON object (not prose), e.g. `{ "title": "...", "bpm": 120, "bars": 8, "code": "..." }` (enforced via Ollama JSON schema format).
  - Pre-flight validation (before attempting playback):
    - Enforce max code size (e.g., 4–8 KB) and reject non-text outputs.
    - Block obvious JS escape/injection tokens (denylist) and require the code to be a single expression.
    - Reject obviously incomplete code (unbalanced parentheses/quotes, too short).
  - Normalization (prototype reliability):
    - Normalize common LLM mistakes (e.g., `note('c','f','a')` → `note("c f a")`, fix `s(note(...))` → `stack(note(...))`, collapse whitespace).
    - Add a default synth for note-based patterns when missing (e.g., `.s("sine")`) to make the result reliably audible.
  - Execution model (prototype-friendly default):
    - Evaluate/play directly in-app via `@strudel/web` and rely on pre-flight validation + a conservative denylist.
    - Follow-up hardening: run evaluation/playback in a sandboxed iframe/worker with a narrow postMessage API and stronger isolation.
  - If the output is invalid (parse/runtime), show a user-facing error and offer:
    - `Fix and retry` (one automated repair pass), then
    - `Regenerate`.
  - If the output is valid but not playable, attempt a heuristic rebuild from extracted `note("...")` fragments, then fall back to an error.
- Playback
  - For a valid generation, the user can start/stop playback.
  - Stopping playback reliably stops audio (no dangling audio nodes).
  - Provide a “Test sound” action to verify browser audio works independently of AI output.
- History
  - Keep the last N generations (default N=20) in local history (localStorage).
  - Each history item can be reloaded into the editor/player.
- Sharing
  - Provide `Copy code` and `Copy prompt + params` actions.
  - v1 (optional but recommended for proto): a shareable URL that restores `prompt + params + code` (no backend).

## Target UX
- Entry point: a single “Generate music” view (beginner-first).
- Primary actions:
  - `Generate` (disabled while running), `Regenerate`, `Play`, `Stop`, `Copy`.
- Layout (minimum)
  - Left: prompt + controls (speed/length/style/variation) + example prompt chips.
  - Right: player controls + status (“Generating…”, “Ready to play”, “Blocked for safety”).
  - Advanced (collapsed by default): code view, with an explicit “I understand” toggle if editing is enabled.
  - Bottom/side: history list with quick restore + delete/clear actions.
- Empty/error states
  - Empty: explain what Strudel is and provide a few prompt examples.
  - Error: show a concise message + “View details” (parse/runtime logs) for debugging.

## Data / technical notes
- Strudel runtime integration (implementation choice)
  - Prototype (fastest): embed Strudel directly in the web app via `@strudel/web` (`initStrudel`, `evaluate`, `hush`).
  - Hardening (follow-up): move evaluation/playback into a sandboxed iframe/worker with a narrow postMessage API if we need stronger isolation.
- AI generation contract
  - Prototype implementation note: use Ollama locally (chat API) from the web app; avoid a dedicated backend initially (local dev proxy to avoid CORS is acceptable).
  - Enforce strict JSON response (JSON schema) and validate schema on receipt.
  - Consider a two-step approach for reliability:
    - Step 1: model outputs a constrained “music recipe” JSON (safe), then
    - Step 2: app renders deterministic Strudel code from that recipe.
  - Add a single “repair” attempt for invalid code (optional).
- Persistence
  - v1: store history in local storage or session storage if no backend exists.
  - If a backend exists: store per-user generations with minimal metadata.
- Observability
  - Track: generation latency (p50/p95), validation block rate, play success rate, and regenerations per session.

## Tests & QA
- Valid prompt generates code that plays with audible output.
- Invalid/empty AI response surfaces a clear error and does not crash the page.
- Injection-like payloads are blocked and never executed.
- Stop reliably stops audio; repeated play/stop does not leak resources.
- History restores the exact code/constraints used.
- Share link (if enabled) restores the exact state and can play immediately.

## Risks / open questions
- Which Strudel feature subset is supported in v1 (to keep validation and playback reliable)?
- Strudel packaging/runtime stability in the target environment (browser/SSR constraints).
- URL length limits for share links (may require compression or backend persistence).
- Audio export expectations (may require a different architecture).
- Content policy/licensing: who owns generated outputs and what styles are allowed?
