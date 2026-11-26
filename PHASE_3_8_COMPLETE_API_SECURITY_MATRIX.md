# Phase 3.8 — Complete API Security Matrix

All 8 route handlers discovered under `app/api/**/route.ts`:

| Route | Methods | Auth | Ownership / Scoping | Rate Limit | Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/chat` | `POST` | `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | `chat:${user.id}` (20/60s) | `phase1-stability.test.ts`, Live Browser QA | **PASS** |
| `/api/attachments/upload` | `POST` | `auth.protect()` + `requireUser()` | `ownerId: user.id`, magic-byte check | Yes | `phase3-4-attachments.test.ts`, Live Browser QA | **PASS** |
| `/api/attachments/[id]` | `GET`, `DELETE` | `auth.protect()` + `requireUser()` | `ownerId: user.id, deletedAt: null` | N/A | Live Browser QA (User A `200`, Edge User B `404`) | **PASS** |
| `/api/conversations/[id]/export` | `GET` | `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | N/A | `phase3-6-export-share.test.ts`, `phase3-6-final-remediation.test.ts` | **PASS** |
| `/api/conversations/[id]/settings` | `GET`, `PATCH` | `auth.protect()` + `requireUser()` | `userId: user.id, deletedAt: null` | N/A | `phase3-7-controls.test.ts`, Live Browser QA | **PASS** |
| `/api/conversations/[id]/shares` | `GET`, `POST` | `auth.protect()` + `requireUser()` | `userId: user.id` | `share:create:${user.id}` (20/60s) | `phase3-6-export-share.test.ts`, Live Browser QA | **PASS** |
| `/api/shares/[shareId]` | `DELETE` | `auth.protect()` + `requireUser()` | `userId: user.id` | N/A | Live Browser QA (`410 Gone` after revoke) | **PASS** |
| `/api/share/[token]` | `GET`, `POST` | Public (SHA-256 `tokenHash`) | `revokedAt`, `expiresAt`, `scrypt` | `share:pw:${ip}:${hash}` (10/60s) | `phase3-6-final-remediation.test.ts`, Live Browser QA | **PASS** |
