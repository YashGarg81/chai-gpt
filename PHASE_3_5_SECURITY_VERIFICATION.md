# Phase 3.5 — Security Evidence Verification

## Cross-User Security Evidence Matrix

| Security Area | User A Owner Test (Chrome) | User B Unauthorized Test (Edge) | Automated Regression (`bun test`) | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Conversation** | `/c/cmwxb0kvs0003roun1ysi0dwj` loaded & streamed cleanly | Edge returned `404` on `/c/cmwxb0kvs0003roun1ysi0dwj` | `phase3-3-1-two-user-security.test.ts` (**PASS**) | **PASS** |
| **Attachment** | `/api/attachments/cmwxb4unp0004roun88tv7qj1` triggered authorized download | Edge (User B) received `404` (`Attachment not found`) on `/api/attachments/cmwxb4unp0004roun88tv7qj1` | `phase3-4-attachments.test.ts` (**PASS**) | **PASS** |
| **Branch** | `loadChatMessages` & `context-assembler.ts` scope by `userId` & `activeBranchId` | Cross-branch/cross-user access blocked by `userId` ownership check | `phase3-2-branching.test.ts` & `phase3-5-hardening.test.ts` (**PASS**) | **PASS** |
| **Summary** | `ConversationSummary` scoped by `(conversationId, branchId, userId)` | `context-assembler.ts` enforces `userId` on reads, updates, and invalidation | `phase3-5-hardening.test.ts` (**PASS**) | **PASS** |
| **Search** | `searchConversations` scoped by `userId` | `searchConversations` filters by `userId` | `phase3-3-1-two-user-security.test.ts` (**PASS**) | **PASS** |

- `bun test`: **38 pass, 0 fail** (11 files, 168 `expect()` calls)
