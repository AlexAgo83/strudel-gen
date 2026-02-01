## task_000_prototype_strudel_ai_generation_web - Prototype Strudel AI generation (web)
> From version: 0.1.0
> Understanding: 80%
> Confidence: 65%
> Progress: 71%

# Context
- Related docs: `logics/backlog/item_000_ai_generated_music_with_strudel_generate_preview.md`, `logics/specs/2026-01-23_strudel_ai_music_generation.md`
- Audience: absolute beginners (no music knowledge).
- Goal: fast web prototype that generates Strudel code from a prompt, previews audio, and supports quick iteration with basic safety guardrails.
- Recommended v1 defaults: 120 BPM, 8 bars, style preset list, variation = balanced, local history (N=20), share via copy + optional URL restore.
- Local AI stack: Ollama (local) with a lightweight Qwen model; no dedicated backend/API initially (dev server proxy is acceptable for local).

# Plan
- [x] 1. Decide Strudel runtime embedding (prototype: direct `@strudel/web` integration; hardening: iframe sandbox later)
- [x] 2. Build single-page UX (prompt + speed/length/style/variation + play/stop + history)
- [x] 3. Add AI generation API contract (Ollama chat + JSON schema) + one repair retry path
- [x] 4. Implement guardrails (size limits, token denylist, basic structure checks, normalization + heuristic fallback)
- [x] 5. Implement share/copy (copy code + params; URL restore without backend)
- [ ] 6. Add basic observability and QA checklist (latency, block rate, play success)
- [ ] FINAL: Update related Logics docs if implementation decisions change

# Validation
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
- Ollama: `curl http://localhost:11434/api/version` and `ollama pull qwen3`
- Web: `cd poc1 && npm run dev`
- Manual smoke test: Test sound → Generate → Play → Stop → Regenerate → Restore from history → Copy/share → Reload shared URL

# Report
- Status: prototype UI and local generation are working under `poc1/`.
- Known limitation: very small local models can output invalid/unplayable Strudel; mitigations include JSON schema forcing, normalization, repair prompt, and a heuristic rebuild fallback.

# Notes
