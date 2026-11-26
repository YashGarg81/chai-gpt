# Phase 3.8 — Performance Report

- **Context Assembly**: Bounded by `calculateTokenBudget()` with non-blocking `updateBranchSummaryInBackground()` and an 8s timeout + deterministic extractive fallback.
- **Database Queries**: Indexed on `(userId, lastMessageAt)`, `(conversationId, branchId, createdAt)`, `(conversationId, branchId)` on `ConversationSummary`, and `tokenHash` on `ConversationShare`.
- **Redis**: Atomic Lua lock renewal/release prevents stale locks during long generations.
- **Test Suite Speed**: 49 tests across 14 files complete in `<1s` (`~908ms`).
