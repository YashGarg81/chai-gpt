# Phase 3.4 — Attachment Visibility Fix

## Changes Made
1. **`features/ai/actions/chat-store.ts`:** `loadChatMessages` now queries `prisma.attachment` (`deletedAt: null, ownerId: user.id, messageId: { in: ... }`) and attaches `metadata.attachments` (id, originalName, mimeType, sizeBytes, fileExtension — never `storageKey`) to each `UIMessage`.
2. **`features/conversation/components/chat-composer.tsx` & `conversation-view.tsx`:** `onSend` passes `SentAttachmentMeta[]` into `sendMessage({ text, metadata: { attachments } }, { body: { attachmentIds } })` so attachments remain visible immediately during and after streaming.
3. **`features/conversation/components/chat-messages.tsx`:** Renders image thumbnails and document chips with secure `/api/attachments/[id]` links inside each user message.
