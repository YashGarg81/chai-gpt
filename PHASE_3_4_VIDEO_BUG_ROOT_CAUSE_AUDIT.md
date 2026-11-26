# Phase 3.4 — Video Bug Root Cause Audit

1. **Scanned PDF returning only page markers:** `pdf-parse` returns `-- 1 of N --` markers for image-only/scanned PDFs; `extract.ts` now strips page markers to detect scanned PDFs, and `/api/chat` sends scanned PDFs natively as `application/pdf` file parts to Gemini 2.5 Flash.
2. **Extracted document text leaking into user message bubble:** `app/api/chat/route.ts` passed `recentMessages` (with `extraParts`) as `originalMessages` to `toUIMessageStream`, which persisted the internal `[Attached Document: ...]` text into the user `Message` row. Fixed by passing `cleanRecentMessages` to `originalMessages`.
3. **Rendering state:** `isWaiting` in `ChatMessages` is scoped to `status === "submitted" && messages.at(-1)?.role === "user"`.
