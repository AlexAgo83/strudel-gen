## req_004_poc3_context_toggle_keep_or_reset - POC3 context toggle (keep or reset)
> From version: 0.1.0
> Understanding: 70%
> Confidence: 65%

# Needs
- Add an option in `poc3/` to choose whether the next prompt should include the previous conversation context or start fresh.
- Provide a “Clear context” action to reset the conversation state.
- Keep the current UX simple: the default should be easy to understand (new chat per prompt unless enabled).
- Keep all changes in `poc3/` only (do not modify `poc2/`).

# Context
- Today `poc3/` sends a single `messages: [{ role: "user", content: prompt }]` to Ollama.
- With Ollama chat, “context” is represented by sending a longer `messages` array including previous user/assistant turns.
- This is an opt-in feature: sometimes users want a clean prompt (no context), sometimes they want follow-ups (“continue”, “refine”, “same constraints”).
