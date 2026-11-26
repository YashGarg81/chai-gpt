# Phase 3.7 — Security Audit

- `GET` and `PATCH /api/conversations/[id]/settings` enforce `auth.protect()`, `requireUser()`, and `{ id, userId: user.id, deletedAt: null }`.
- `model` is validated against `SUPPORTED_CHAT_MODELS` allowlist; `systemPrompt` is capped at `4_000` characters.
- No internal user IDs or secrets are exposed in responses.
