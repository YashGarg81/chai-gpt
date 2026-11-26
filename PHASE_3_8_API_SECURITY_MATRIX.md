# Phase 3.8 — API & Security Matrix

| Route | Methods | Auth | Ownership Check | Rate Limit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/chat` | `POST` | Clerk `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | `chat:${user.id}` (20/60s) | **PASS** |
| `/api/attachments/upload` | `POST` | Clerk `auth.protect()` + `requireUser()` | `ownerId: user.id` | Yes | **PASS** |
| `/api/attachments/[id]` | `GET`, `DELETE` | Clerk `auth.protect()` + `requireUser()` | `ownerId: user.id, deletedAt: null` | N/A | **PASS** |
| `/api/conversations/[id]/export` | `GET` | Clerk `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | N/A | **PASS** |
| `/api/conversations/[id]/settings` | `GET`, `PATCH` | Clerk `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | N/A | **PASS** |
| `/api/conversations/[id]/shares` | `GET`, `POST` | Clerk `auth.protect()` + `requireUser()` | `userId: user.id` | `share:create:${user.id}` (20/60s) | **PASS** |
| `/api/shares/[shareId]` | `DELETE` | Clerk `auth.protect()` + `requireUser()` | `userId: user.id` | N/A | **PASS** |
| `/api/share/[token]` | `GET`, `POST` | Public (SHA-256 `tokenHash`) | `revokedAt`, `expiresAt`, `scrypt` | `share:pw:${ip}:${hash}` (10/60s) | **PASS** |
