# Phase 3.5 — Security Audit

## Mitigations Implemented
1. **Prompt-Injection Hardening (`features/context/utils/security.ts`)**
   - `sanitizeUntrustedText()` neutralizes role-spoofing prefixes (`system:`, `developer:`, `assistant:`, `<|im_start|>`, `<|system|>`) by prefixing `[quoted-role]`.
   - Summaries, retrieved historical snippets, and attachment text are explicitly framed as untrusted data, never privileged instructions.
2. **Ownership & Isolation**
   - `ConversationSummary` queries filter by `conversationId`, `branchId`, and `userId`.
   - `loadChatMessages()` and `app/api/chat/route.ts` enforce `userId: user.id`, `deletedAt: null`, `supersededAt: null`, and `branchId: conversation.activeBranchId`.
   - Attachments are verified against `ownerId: user.id`, `conversationId: id`, `deletedAt: null`, and `processingStatus: "READY"`.
3. **Observability Safety**
   - Diagnostics track counts, token budgets, strategy, and duration without logging raw user prompts or document contents.
