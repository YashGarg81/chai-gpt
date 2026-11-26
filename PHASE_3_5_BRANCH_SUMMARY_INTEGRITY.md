# Phase 3.5 — Branch Summary Integrity

- **Uniqueness**: `ConversationSummary.branchId` is `String @default("main")` (non-nullable), backed by `@@unique([conversationId, branchId])`.
- **Descendant Invalidation**: `invalidateAffectedBranchSummaries()` in `features/context/services/context-assembler.ts` computes all descendant branches from `ConversationBranch.parentBranchId` and deletes their `ConversationSummary` rows when `supersededIds.length > 0` in `app/api/chat/route.ts`.
- **Sibling Isolation**: Unrelated sibling branches are excluded from the BFS invalidation set and retain their summaries.
