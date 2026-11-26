# Phase 3.5 — Final Hardening Audit

## Summary of 5 Hardening Requirements
1. **Branch Summary Uniqueness**: `ConversationSummary.branchId` is non-nullable `String @default("main")` with `@@unique([conversationId, branchId])`. PostgreSQL enforces strict uniqueness for both `"main"` and named branches.
2. **Descendant Summary Invalidation**: `invalidateAffectedBranchSummaries()` in `features/context/services/context-assembler.ts` traverses `ConversationBranch.parentBranchId` via BFS and deletes summaries for the edited branch and all descendants while preserving unrelated sibling branches.
3. **Stale Summary Write Prevention**: `updateBranchSummaryInBackground()` uses optimistic concurrency (`version: expectedVersion` in `updateMany`, plus `create` conflict handling) so in-flight summarizations cannot overwrite invalidated or newer summaries.
4. **Prompt-Injection & Cross-User Security**: `sanitizeUntrustedText()` neutralizes role-spoofing prefixes; summaries, retrieved snippets, and attachments are framed as untrusted data; all DB queries scope by `userId` / `ownerId`.
5. **Browser QA**: Verified on `http://localhost:3000/c/cmwxa1otv0000rounbjvnibtr` with multi-turn context recall and 0 console errors.
