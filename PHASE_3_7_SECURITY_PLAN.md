# Phase 3.7 — Security Plan

- **Authentication**: `await auth.protect()` + `await requireUser()` on both `GET` and `PATCH /api/conversations/[id]/settings`.
- **Ownership / IDOR**: All queries filter by `{ id, userId: user.id, deletedAt: null }`.
- **Input Validation**:
  - `model` must be `null` or in `SUPPORTED_CHAT_MODELS` (prevents arbitrary model injection).
  - `systemPrompt` capped at `4_000` characters.
- **No Sensitive Leakage**: Never return `userId`, `deletedAt`, or internal tokens.
