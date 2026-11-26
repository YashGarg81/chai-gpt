# Phase 3.4 — Security Report
- **Upload Validation:** Magic-byte signature checks (`%PDF-`, PNG, JPEG, WEBP, DOCX `PK`), `20 MB` / `5` files / `50 MB` limits, null-byte & path-traversal rejection, and `X-Content-Type-Options: nosniff` on downloads.
- **Authorization:** Clerk `auth.protect()` + `requireUser()` + `ownerId === user.id` on `POST /api/attachments/upload`, `GET/DELETE /api/attachments/[id]`, and `POST /api/chat`.
- **Limitations:** No antivirus scanner is integrated; `.chai-storage/` is local-disk storage for single-node dev (use S3/R2 for multi-instance serverless).
