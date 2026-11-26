# Phase 3.7 — Initial Audit

## 1. Existing Implementation
- `prisma/schema.prisma`: `Conversation` already has `model String?` and `systemPrompt String? @db.Text`.
- `app/api/chat/route.ts`: Already passes `conversation.model` to `getChatModel(conversation.model)` and `conversation.systemPrompt` to `assembleChatContext({ baseSystemPrompt: conversation.systemPrompt, ... })`.
- `features/conversation/components/conversation-view.tsx`: Displays a static `openrouter/free` badge in the header with no UI to change the model or edit `systemPrompt`.

## 2. Missing Functionality
- No API endpoint to read/update `Conversation.model` and `Conversation.systemPrompt`.
- No UI dialog/controls for per-conversation model selection and custom system prompt editing.
- No validation allowlist for `model` or length cap for `systemPrompt`.

## 3. Database Impact
- **Zero Prisma migrations required**: `Conversation.model` and `Conversation.systemPrompt` already exist in `prisma/schema.prisma`.
