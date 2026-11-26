# Phase 3.4 — PDF Extraction Fix
- `features/attachments/utils/extract.ts`: Strips `-- N of M --` page markers; if `< 20` meaningful characters remain, returns `""` so `app/api/chat/route.ts` sends the PDF binary directly to Gemini 2.5 Flash (`application/pdf` file part) for native multimodal reading/OCR.
