# Phase 3.4 — Implementation Summary

- **Database:** `20261125180712_phase_3_4_attachments` (`AttachmentStatus` enum + `Attachment` model).
- **Storage (`lib/storage.ts`):** Private local storage (`.chai-storage/`, gitignored) with `StorageProvider` interface and path-traversal protection.
- **Validation & Extraction:** `features/attachments/utils/validation.ts` (magic bytes, 20 MB / 5 files / 50 MB limits) and `features/attachments/utils/extract.ts` (`pdf-parse`, `mammoth`, UTF-8 TXT, CSV).
- **APIs:** `POST /api/attachments/upload`, `GET /api/attachments/[id]`, `DELETE /api/attachments/[id]`, and `attachmentIds` wiring in `POST /api/chat`.
- **Frontend:** `ChatComposer` attachment picker, drag-and-drop, image/document previews, and `ConversationView` transport wiring.
