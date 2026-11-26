# Phase 3.4 — Codebase Audit

## 1. Existing Architecture
- **Chat:** `app/api/chat/route.ts` uses `streamText` with `gemini-2.5-flash` (`@ai-sdk/google`), `requireUser()`, Redis rate limiting, and Redis lock/lease renewal.
- **Database:** `prisma/schema.prisma` has `User`, `Conversation`, `ConversationFolder`, `ConversationBranch`, and `Message`.
- **Storage:** No object storage provider is currently configured.

## 2. Implementation Plan
- **Storage (`lib/storage.ts`):** Private `StorageProvider` abstraction (local private `.chai-storage/` directory for single-node dev, extensible to S3/R2).
- **Database:** Add `AttachmentStatus` enum and `Attachment` model.
- **Validation & Extraction:** Magic-byte validation, 20 MB / 5 files / 50 MB limits, `pdf-parse` (PDF), `mammoth` (DOCX), UTF-8 (TXT), structured CSV parser, and native Gemini image parts (PNG/JPEG/WEBP).
- **APIs:** `POST /api/attachments/upload`, `GET /api/attachments/[id]`, `DELETE /api/attachments/[id]`, and `attachmentIds` wiring in `POST /api/chat`.
