## item_003_poc3_context_toggle_keep_or_reset - POC3 context toggle (keep or reset)
> From version: 0.1.0
> Understanding: 75%
> Confidence: 70%
> Progress: 100%

# Problem
Users sometimes want to ask follow-up prompts (“continue”, “refine”, “same constraints”), and sometimes want a clean prompt with no prior context. Without an explicit control, it’s unclear whether the model should use previous turns.

Promoted from `logics/request/req_004_poc3_context_toggle_keep_or_reset.md`.

# Scope
- In:
  - Add a UI option to enable/disable conversation context for the next request.
  - Maintain an in-memory chat message list (`messages[]`) and send it to Ollama when context is enabled.
  - Provide “Clear context” to reset the stored message list.
  - Keep this feature compatible with streaming and cancellation.
  - Implement only in `poc3/` (do not change `poc2/`).
- Out:
  - Persisting chat history (localStorage/server).
  - Full chat transcript UI with rich user/assistant bubbles (a lightweight response history may exist in later changes).

# Acceptance criteria
- When “Keep context” is OFF, a new prompt is sent as a single-turn chat (`messages` contains only the current user prompt).
- When “Keep context” is ON, a new prompt is sent including the previous stored user/assistant messages plus the current user prompt.
- “Clear context” resets the stored conversation so the next request has no prior messages.
- Streaming UI remains functional (partial rendering), and “Stop” still cancels correctly.
- `cd poc3 && npm run lint` and `cd poc3 && npm run build` succeed.

# Priority
- Impact: Medium (improves iterative prompting).
- Urgency: Medium (useful for ongoing POC work).

# Notes
- Implementation lives in `poc3/src/App.tsx` (state + UI) and `poc3/src/lib/ollama.ts` (message-based streaming).
