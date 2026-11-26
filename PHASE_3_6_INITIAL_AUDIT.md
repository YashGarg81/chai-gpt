# Phase 3.6 — Initial Architecture Audit

## 1. Existing Reusable Functionality
- **Auth & Ownership**: `auth.protect()` + `requireUser()` (`features/auth/action/require-user.ts`) and `prisma.conversation.findFirst({ where: { id, userId: user.id, deletedAt: null } })`.
- **Messages & Branching**: `Message` model supports `branchId`, `parentMessageId`, `versionNumber`, and `supersededAt`.
- **Attachments**: `Attachment` model stores `originalName`, `mimeType`, `sizeBytes`, `fileExtension` (private `storageKey` must never be exposed in exports or shares).
- **Middleware**: `proxy.ts` protects all routes except `/sign-in(.*)`.

## 2. Missing Functionality & Required Changes
- **Database**: Add `ConversationShare` model (`id`, `conversationId`, `userId`, `branchId`, `tokenHash` `@unique`, `title`, `snapshotJson`, `includeTimestamps`, `includeAttachments`, `showTitle`, `passwordHash`, `expiresAt`, `revokedAt`, `createdAt`, `updatedAt`).
- **Middleware**: Allow `/share(.*)` and `/api/share(.*)` in `proxy.ts` for public read-only snapshot viewing.
- **Export**: Add `features/export/utils/formatters.ts` (`.md`, `.json`, `.txt`, `.pdf`) and `GET /api/conversations/[id]/export`.
- **Sharing**: Add `features/share/utils/tokens.ts` (SHA-256 token hashing, scrypt password hashing), `POST/GET /api/conversations/[id]/shares`, `DELETE /api/shares/[shareId]`, `GET/POST /api/share/[token]`, and `/share/[token]` public viewer page.
- **UI**: Add Export & Share dialogs/controls to `ChatShell` / conversation header.
