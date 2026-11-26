# Phase 3.4 — Attachment Visibility Bug Audit

## Root Cause
1. `ChatComposer` cleared `attachments` on send and `sendMessage({ text })` did not include attachment metadata in the optimistic `UIMessage`.
2. `loadChatMessages` in `features/ai/actions/chat-store.ts` did not load `prisma.attachment` records linked to `messageId`, so historical messages after refresh had no attachment metadata.
3. `ChatMessages` only rendered `getMessageText(message)` and did not render attachment chips/thumbnails.
