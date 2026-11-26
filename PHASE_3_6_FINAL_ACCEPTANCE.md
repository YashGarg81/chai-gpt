# Phase 3.6 — Final Acceptance

| Area | Status | Evidence |
| :--- | :--- | :--- |
| Unicode PDF | **PASS** | `pdfkit` + embedded `NotoSansDevanagari-Regular.ttf` + `Helvetica` mixed-script rendering; `pdf-parse` extraction verified `Hello ChaiGPT`, `नमस्ते`, `भारत`, `Yash`, `ChaiGPT Export - Page 1 of`, 0 `????` |
| Markdown export | **PASS** | Automated (`phase3-6-export-share.test.ts`, `phase3-6-final-remediation.test.ts`) + Export Dialog QA |
| TXT export | **PASS** | Automated (`phase3-6-export-share.test.ts`, `phase3-6-final-remediation.test.ts`) |
| JSON export | **PASS** | Automated (`schemaVersion: "1.0"`, no `storageKey`/`tokenHash`/`passwordHash`) |
| PDF pagination | **PASS** | Automated (`ChaiGPT Export - Page 1 of N`, `Page 2 of N`) |
| Password protection | **PASS** | Automated (`scrypt` + `timingSafeEqual` + `checkRateLimit` on `POST /api/share/[token]`) |
| Expiry | **PASS** | Server-side `expiresAt <= Date.now()` check returning `410` |
| Revocation | **PASS** | Live Browser QA (`/share/...` -> `Revoke share` -> `410 Gone`) |
| Snapshot immutability | **PASS** | Frozen `snapshotJson` stored on `ConversationShare` at creation |
| Cross-user authorization | **PASS** | `userId: user.id` enforced on export, share list/create/revoke |
| Attachment privacy | **PASS** | `storageKey` excluded from all exports & public snapshots |
| XSS protection | **PASS** | `Streamdown` + `phase3-3-1-xss-security.test.ts` |
| Prisma migrations | **PASS** | `prisma validate` / `migrate status` / `generate` (exit code 0) |
| Automated tests | **PASS** | `bun test`: 45 pass, 0 fail (13 files, 207 `expect()` calls) |
| TypeScript/lint/build | **PASS** | `tsc --noEmit`, `npm run lint`, `npm run build` (exit code 0) |
| Browser QA | **PASS** | Export dialog, Share creation, Public viewer, Revocation (`410`) verified |
