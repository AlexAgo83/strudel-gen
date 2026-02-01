## item_004_poc3_history_default_context_shortcuts - POC3 history + default context + shortcuts
> From version: 0.1.0
> Understanding: 80%
> Confidence: 75%
> Progress: 100%

# Problem
The POC needs faster iteration and better visibility during streaming. Users want context kept by default, a quick keyboard send, and a visible history of recent responses with the newest on top.

Promoted from `logics/request/req_005_poc3_history_default_context_shortcuts.md`.

# Scope
- In:
  - Keep “Keep context” enabled by default.
  - Maintain a response history list (newest first), including the prompt, response, and streaming state.
  - Show partial output live while streaming (latest entry).
  - Provide quick actions at the top: Stop, Copy latest, Clear history.
  - Clear the prompt input right after sending.
  - Add `Cmd+Enter` / `Ctrl+Enter` to send the prompt.
  - Keep compatibility with streaming + cancellation.
  - Implement only in `poc3/` (do not change `poc2/`).
- Out:
  - Persistent chat history (localStorage/server).
  - Full chat transcript UI with rich user/assistant bubbles.

# Acceptance criteria
- On load, “Keep context” is ON.
- Sending a prompt clears the textarea immediately.
- `Cmd+Enter` / `Ctrl+Enter` sends the prompt.
- The history list shows the newest entry first.
- While streaming, the newest entry updates live.
- Actions (Stop, Copy latest, Clear history) are visible at the top of the history panel.
- `cd poc3 && npm run build` succeeds.

# Notes
- Implementation lives in `poc3/src/App.tsx` and `poc3/src/App.css`.

- Derived from `logics/request/req_005_poc3_history_default_context_shortcuts.md`.
# Priority
- Impact:
- Urgency:
