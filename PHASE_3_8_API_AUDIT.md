# Phase 3.8 — Complete API Audit

| Endpoint | Methods | Auth | Ownership / Scoping | Rate Limit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/chat` | `POST` | `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | `chat:${user.id}` (20/60s) | **PASS** |
| `/api/attachments/upload` | `POST` | `auth.protect()` + `requireUser()` | `ownerId: user.id`, magic-byte validation | Yes | **PASS** |
| `/api/attachments/[id]` | `GET`, `DELETE` | `auth.protect()` + `requireUser()` | `ownerId: user.id, deletedAt: null` | N/A | **PASS** |
| `/api/conversations/[id]/export` | `GET` | `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | N/A | **PASS** |
| `/api/conversations/[id]/settings` | `GET`, `PATCH` | `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | N/A | **PASS** |
| `/api/conversations/[id]/shares` | `GET`, `POST` | `auth.protect()` + `requireUser()` | `userId: user.id` | `share:create:${user.id}` (20/60s) | **PASS** |
| `/api/shares/[shareId]` | `DELETE` | `auth.protect()` + `requireUser()` | `userId: user.id` | N/A | **PASS** |
| `/api/share/[token]` | `GET`, `POST` | Public (token-hash) | `tokenHash`, `revokedAt`, `expiresAt`, `scrypt` | `share:pw:${ip}:${hash}` (10/60s) | **PASS** |
