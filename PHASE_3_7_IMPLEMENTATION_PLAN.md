# Phase 3.7 — Implementation Plan

1. **Settings Validation & Constants (`features/conversation/utils/chat-controls.ts`)**
   - Define `SUPPORTED_CHAT_MODELS` allowlist and `MAX_SYSTEM_PROMPT_CHARS = 4_000`.
   - Implement `validateChatControlsInput({ model, systemPrompt })`.
2. **Backend API (`app/api/conversations/[id]/settings/route.ts`)**
   - `GET`: Returns `{ model, systemPrompt }` for the authenticated owner.
   - `PATCH`: Validates input, enforces `userId: user.id, deletedAt: null`, updates `Conversation`.
3. **Frontend UI (`features/conversation/components/chat-controls-dialog.tsx`)**
   - Modal with model selector, system prompt textarea with character count, Reset/Save buttons, loading/error states.
   - Wired into `conversation-view.tsx` header (interactive model pill button).
4. **Testing & QA**
   - Unit/validation tests in `__tests__/phase3-7-controls.test.ts`.
   - Full validation (`bun test`, `tsc --noEmit`, `npm run lint`, `npm run build`) and browser QA.
