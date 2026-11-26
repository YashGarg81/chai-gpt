# Phase 3.7 — Implementation Summary

- `features/conversation/utils/chat-controls.ts`: `SUPPORTED_CHAT_MODELS` allowlist, `MAX_SYSTEM_PROMPT_CHARS = 4_000`, and `validateChatControlsInput()`.
- `app/api/conversations/[id]/settings/route.ts`: Owner-scoped `GET` and `PATCH` endpoints for `Conversation.model` and `Conversation.systemPrompt`.
- `features/conversation/components/chat-controls-dialog.tsx`: Modal for per-conversation model selection and custom system instructions with character counter, loading/saving states, and error handling.
- `features/conversation/components/conversation-view.tsx`: Replaced static model badge with interactive `Open chat controls` button.
