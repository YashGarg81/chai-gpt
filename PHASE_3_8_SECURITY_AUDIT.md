# Phase 3.8 — Security Audit

- **Authentication & IDOR**: All private routes enforce `auth.protect()` + `requireUser()` and scope Prisma queries by `userId` / `ownerId` and `deletedAt: null`. Live two-browser testing (Chrome User A vs Edge User B) confirmed `404` on cross-user conversation and attachment access.
- **XSS & Prompt Injection**: `Streamdown` + URL sanitization (`phase3-3-1-xss-security.test.ts`), `sanitizeUntrustedText()` role-spoofing neutralization, immutable core system prompt (`context-assembler.ts`), and untrusted-data framing for summaries, retrieved history, and attachments.
- **Sharing Cryptography**: 32-byte `base64url` tokens stored as SHA-256 hashes; passwords hashed with `scrypt` + 16-byte salt and verified with `timingSafeEqual`.
