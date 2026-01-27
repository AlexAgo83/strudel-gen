## req_003_poc3_streaming_response_progress_reflection - POC3 streaming response + progress + reflection
> From version: 0.1.0
> Understanding: 70%
> Confidence: 60%

# Needs
- Add streaming for the assistant response in `poc3/` (render partial output as it arrives).
- Show execution progress while the prompt is running (at least: elapsed time and amount of output received).
- Provide a “Stop” action to cancel an in-flight generation.
- If the model provides “reflection/thinking”, show a live preview of it (best-effort, only when available).
- Keep `poc2/` frozen (no changes); all work is done in `poc3/`.

# Context
- Current baseline: `poc3/` is a copy of `poc2/` (prompt → response via Ollama, local proxy, Markdown rendering).
- API: Ollama `POST /api/chat` supports `stream: true` for incremental output.
- UX constraints:
  - Streaming should not block the UI; the response panel updates progressively.
  - Partial Markdown is acceptable during streaming (some blocks may be incomplete until the end).
- “Reflection preview” is best-effort because models differ:
  - Some models include `<think>...</think>` blocks or similar tags.
  - If no reflection is present, only the final answer is shown.
