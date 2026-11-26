# Phase 3.4 — File Extraction Report
- **Supported:** PDF (`pdf-parse`), DOCX (`mammoth`), TXT (UTF-8), CSV (bounded `500` rows, `40,000` chars).
- **Unsupported:** Legacy binary `.doc` is explicitly rejected with a clear user-facing error.
- **Automated Evidence:** Verified in `__tests__/phase3-4-attachments.test.ts`.
