# Phase 3.2 — Codebase Audit & Architecture Plan

## 1. Existing Capabilities
- `Message` model stores `id`, `conversationId`, `role`, `status`, `content`, `parts`, `metadata`, `createdAt`, `updatedAt`.
- `app/api/chat/route.ts` supports Gemini streaming (`gemini-2.5-flash`), `abortSignal`, rate limiting, and Phase 2 regeneration (slicing `previousMessages` to `targetIndex + 1`).
- `ChatMessages` renders markdown, Copy, and Regenerate on the last assistant message.

## 2. Missing Functionality
- Inline editing of user messages with Save / Cancel and Edit & Resend.
- Conversation branching (`ConversationBranch`, `activeBranchId`, branch switcher persisted in DB).
- Non-destructive message version history (`supersededAt`, `parentMessageId`, `versionNumber`).

## 3. Architectural & Migration Plan
- Add `activeBranchId` to `Conversation`, `ConversationBranch` table, and `branchId`, `parentMessageId`, `versionNumber`, `supersededAt` to `Message` (all nullable/defaulted so existing data is 100% preserved).
- Update `loadChatMessages` to load active-branch (`branchId === conversation.activeBranchId`) and non-superseded (`supersededAt: null`) messages.
- Update `POST /api/chat` `onEnd` to soft-supersede (`supersededAt: new Date()`) instead of hard-deleting previous assistant responses during regeneration.
