# Phase 3.6 — Security Audit

1. **Ownership Enforcement**:
   - `GET /api/conversations/[id]/export` verifies `userId: user.id, deletedAt: null`.
   - `GET/POST /api/conversations/[id]/shares` and `DELETE /api/shares/[shareId]` enforce `userId: user.id`.
2. **Token & Password Security**:
   - Share tokens are 32-byte `crypto.randomBytes(32).toString("base64url")` and stored only as SHA-256 hashes (`tokenHash`).
   - Share passwords are hashed with `crypto.scryptSync` + 16-byte random salt and verified with `crypto.timingSafeEqual`.
3. **Public Snapshot Isolation**:
   - `/share/[token]` and `/api/share/[token]` expose only the frozen `snapshotJson` (no `userId`, email, `storageKey`, system prompts, or other conversations).
   - Revoked or expired shares return `410`.
   - `proxy.ts` allows `/share(.*)` and `/api/share(.*)` as public routes while keeping all other routes protected.
