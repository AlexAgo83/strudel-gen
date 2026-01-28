## req_005_poc3_history_default_context_shortcuts - POC3 history + default context + shortcuts
> From version: 0.1.0
> Understanding: 80%
> Confidence: 75%

# Needs
- Keep “Keep context” enabled by default for new sessions.
- Show a response history list, newest at the top.
- While streaming, show partial output live in the latest history entry.
- Provide quick actions near the top: Stop, Copy latest, Clear history.
- Clear the prompt input immediately after sending.
- Add keyboard shortcut: `Cmd+Enter` / `Ctrl+Enter` to send.
- Keep changes in `poc3/` only.

# Context
- POC3 already supports Ollama streaming and a context toggle.
- We need faster iteration: always-on context, visible response history, and quick keyboard send.
