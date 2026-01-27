## task_003_poc3_context_toggle_keep_or_reset - POC3 context toggle (keep or reset)
> From version: 0.1.0
> Understanding: 75%
> Confidence: 70%
> Progress: 100%

# Context
Derived from `logics/backlog/item_003_poc3_context_toggle_keep_or_reset.md`.

# Plan
- [x] 1. Clarify scope and acceptance criteria
- [x] 2. Add message-based streaming helper (messages[])
- [x] 3. Add “Keep context” + “Clear context” controls in the UI
- [x] FINAL: Update related Logics docs

# Validation
- `cd poc3 && npm run lint`
- `cd poc3 && npm run build`
- Manual smoke: `cd poc3 && npm run dev` → send prompt → toggle keep context → send follow-up prompt → clear context → send again

# Report
- Added an opt-in “Keep context” toggle and “Clear context” action in `poc3/src/App.tsx`.
- Added message-based streaming support in `poc3/src/lib/ollama.ts` to send an explicit `messages[]` array to Ollama.
