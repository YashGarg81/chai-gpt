# Phase 6 — Security Audit & Route Authorization Matrix

## 1. Route-by-Route Authorization Matrix

| Route | Methods | Auth | Identity | Ownership Scope | Validation & Rate Limit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/chat` | `POST` | `auth.protect()` | `requireUser()` | `conversation.userId === user.id`, attachments `userId === user.id` | Model allowlist, Redis rate limit & distributed lock |
| `/api/profile` | `GET`, `PATCH` | `auth.protect()` | `requireUser()` | `where: { id: user.id }` | `validateProfileUpdate()` allowlist (strips `id`, `clerkId`, `email`, `role`) |
| `/api/attachments/upload` | `POST` | `auth.protect()` | `requireUser()` | `userId: user.id` | Magic-byte, MIME, size & filename validation; server-generated `storageKey` |
| `/api/attachments/[id]` | `GET`, `DELETE` | `auth.protect()` | `requireUser()` | `where: { id, userId: user.id }` | DB-resolved `storageKey` only (no client path) |
| `/api/conversations/[id]/export` | `GET` | `auth.protect()` | `requireUser()` | `where: { id, userId: user.id }` | Format allowlist (`md`, `txt`, `json`, `pdf`), excludes `storageKey` |
| `/api/conversations/[id]/settings` | `PATCH` | `auth.protect()` | `requireUser()` | `where: { id, userId: user.id }` | `SUPPORTED_CHAT_MODELS` & prompt length validation |
| `/api/conversations/[id]/shares` | `GET`, `POST` | `auth.protect()` | `requireUser()` | `where: { id, userId: user.id }` | Cryptographic 256-bit token + scrypt password hash |
| `/api/shares/[shareId]` | `DELETE` | `auth.protect()` | `requireUser()` | `where: { id: shareId, userId: user.id }` | Soft-revokes (`revokedAt`) |
| `/api/share/[token]` | `GET`, `POST` | Public | `hashShareToken(token)` | Active, non-revoked, non-expired share | Redis rate limit (`10/60s` per IP + tokenHash), never returns `passwordHash` |

## 2. Live Security Headers (`curl.exe -I -s http://localhost:3000/sign-in`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-DNS-Prefetch-Control: off`
