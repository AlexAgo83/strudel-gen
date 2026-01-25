## item_000_ai_generated_music_with_strudel_generate_preview - AI-generated music with Strudel (generate + preview)
> From version: 0.1.0
> Understanding: 80%
> Confidence: 70%
> Progress: 0%

# Problem
Absolute beginners (no music knowledge) want to generate short musical loops quickly from natural language, then preview and iterate without learning Strudel. Today there is no end-to-end flow that converts an intent (prompt) into playable Strudel code inside the product.

# Scope
- In: Generate Strudel code from a prompt + constraints (tempo/BPM, duration, style tags, complexity).
- In: In-app Strudel playback with basic transport controls (play/stop) and visible code editor.
- In: Regenerate / tweak constraints and keep a generation history (per user/session).
- In: Basic safety/validation layer to reject non-Strudel output and prevent arbitrary JS execution.
- In: Shareable artifact (copy/share Strudel code + parameters).
- Out: High-fidelity audio export (WAV) and stems.
- Out: MIDI export (unless trivially supported by the chosen Strudel runtime).
- Out: Advanced mixing/mastering, detailed sound design UI.
- Out: Full collaborative live-coding / multiplayer editing.

# Acceptance criteria
- Given a prompt and constraints, the system returns syntactically valid Strudel code (or a clear error message) within an acceptable time budget (target p95 < 12s).
- The generated code can be played in-app via Strudel with play/stop and shows an audible result for valid outputs.
- Users can regenerate and the UI keeps the last N generations (default N=20) including prompt, constraints, code, timestamp, and status.
- Unsafe outputs are blocked (e.g., attempts to inject JS) and surfaced as a user-facing validation error.
- Users can copy the generated Strudel code + parameters from the UI; optional v1: share via URL that restores the exact state.

# Priority
- Impact:
- Impact: High (new capability + strong user value).
- Urgency: Medium (depends on product roadmap and AI budget).

# Notes
- Platform: Web app (browser).
- Target audience: absolute beginners (no music knowledge). UI must avoid jargon and work with sensible defaults.
- Prototype goal: ship an end-to-end demo quickly; prefer local-only persistence (localStorage) and minimal backend.
- Prototype AI stack: Ollama (local) with a lightweight Qwen model; no dedicated backend/API initially.
- Prototype implementation: `poc1/` (Vite+React), direct Strudel integration via `@strudel/web`, with guardrails + normalization + repair/fallback to increase playability with small models.
- Implementation depends on: (1) the selected Strudel runtime integration approach, (2) the LLM provider and prompt format, (3) the desired persistence model (session vs. user account).
