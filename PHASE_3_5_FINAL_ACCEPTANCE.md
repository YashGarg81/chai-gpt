# Phase 3.5 — Final Acceptance

| Requirement | Status | Evidence |
| :--- | :--- | :--- |
| 1. Branch summary uniqueness | **PASS** | Non-nullable `branchId @default("main")` + `@@unique([conversationId, branchId])` |
| 2. Descendant summary invalidation | **PASS** | `invalidateAffectedBranchSummaries()` in `context-assembler.ts` + `route.ts` |
| 3. Stale summary write prevention | **PASS** | Optimistic `version` check in `updateBranchSummaryInBackground()` + unit test |
| 4. Prompt-injection & cross-user security | **PASS** | `security.ts` + `userId` scoping + `phase3-5-hardening.test.ts` + Live two-browser test (Edge User B got `404` on Chrome User A's conversation) |
| 5. Comprehensive browser QA | **PASS** | Multi-topic recall (**PASS**), Regenerate (**PASS**), Attachment upload/Q&A/persistence (**PASS**), Two-user isolation (**PASS**), Console (**PASS**) |

- `bun test`: **38 pass, 0 fail** (11 files, 168 `expect()` calls)
- `npx prisma validate` / `migrate status` / `generate`: **PASS** (exit code 0)
- `.\node_modules\.bin\tsc --noEmit`: **PASS** (exit code 0)
- `npm run lint`: **PASS** (exit code 0)
- `npm run build`: **PASS** (exit code 0)

