## item_002_poc3_streaming_response_progress_reflection - POC3 streaming response + progress + reflection
> From version: 0.1.0
> Understanding: 80%
> Confidence: 75%
> Progress: 100%

# Problem
Users need faster feedback when running prompts in `poc3/`. Waiting for a full response makes iteration slow and hides whether the model is progressing, stalled, or unreachable.

Promoted from `logics/request/req_003_poc3_streaming_response_progress_reflection.md`.

# Scope
- In:
  - Use Ollama chat streaming (`stream: true`) to update the response UI incrementally.
  - Show progress indicators while streaming (elapsed time + output size at minimum).
  - Add a “Stop” action to cancel an in-flight request.
  - Best-effort “reflection/thinking” preview if present in the streamed content.
  - Keep all changes in `poc3/` only (do not modify `poc2/`).
- Out:
  - Server-side persistence, multi-turn chat history, and streaming to multiple clients.
  - Semantic progress (token rate, ETA) unless Ollama provides it reliably.
  - Guaranteed reflection support (model-dependent).

# Acceptance criteria
- When sending a prompt, the response panel updates progressively (no need to wait for completion).
- A progress indicator is visible while running (elapsed time + output size).
- “Stop” cancels the current request without breaking subsequent requests.
- If the model outputs reflection tags (e.g. `<think>...</think>`), the UI shows a live preview section; otherwise it stays hidden.
- `cd poc3 && npm run lint` and `cd poc3 && npm run build` succeed.

# Priority
- Impact: High (reduces iteration time and improves debugging).
- Urgency: Medium (helps ongoing POC work).

# Notes
- Implementation: `poc3/src/lib/ollama.ts` (stream reader) + `poc3/src/App.tsx` (UI/progress/reflection).
