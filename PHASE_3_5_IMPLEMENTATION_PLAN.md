# Phase 3.5 — Implementation Plan

## Architecture Overview
Create a modular `features/context/` subsystem that integrates cleanly into `app/api/chat/route.ts` without breaking existing APIs, streaming, branching, editing, regeneration, or attachments.

## Subphases

1. **Database Schema (`prisma/schema.prisma`)**
   - Add `ConversationSummary` model (`id`, `conversationId`, `branchId`, `userId`, `summaryJson`, `summaryText`, `coveredUntilMessageId`, `coveredMessageCount`, `version`, `updatedAt`, `createdAt`) with `@@unique([conversationId, branchId])` and `@@index([userId, conversationId])`.
   - Run `prisma validate`, `prisma migrate dev` (or `prisma db push` if shadow DB is unavailable, then `prisma generate`).

2. **Token Budget Engine (`features/context/utils/token-budget.ts`)**
   - Model-aware context window registry (e.g., `openrouter/free`, `gemini-2.5-flash`, `gpt-4o`, etc., with safe conservative defaults).
   - Conservative token estimator handling ASCII, code, Markdown, URLs, JSON, CJK/Hindi/Unicode, and multimodal/image payloads.
   - Budget allocator dividing total context into: `system`, `developer`, `summary`, `retrieval`, `recent`, `currentUser`, `attachments`, `safetyMargin`, and `reservedOutput`.

3. **Security & Prompt-Injection Hardening (`features/context/utils/security.ts`)**
   - Sanitize and frame untrusted historical/retrieved/summary/attachment text so it cannot override system/developer instructions.
   - Strip/neutralize role-spoofing markers.

4. **Historical Context Retrieval (`features/context/utils/retrieval.ts`)**
   - Conversation-scoped, branch-aware lexical/BM25-style relevance scoring over older messages not in the recent window.
   - Respects `deletedAt: null`, `supersededAt: null`, ownership, and retrieval token budget.

5. **Conversation Summarization & Compaction (`features/context/utils/summarization.ts`)**
   - Structured `ConversationSummaryData` (`conversationGoal`, `topics`, `requirements`, `decisions`, `technicalContext`, `importantFacts`, `pendingTasks`, `unresolvedQuestions`, `lastKnownState`, `updatedAt`).
   - Controlled trigger: only summarizes when older messages exceed threshold and aren't already covered.
   - Safe fallback: if LLM summarization fails, falls back to deterministic extractive summary or recent-only selection without blocking chat.
   - Non-destructive compaction: original messages in `Message` table are never deleted or modified.

6. **Context-Aware Prompt Assembly (`features/context/services/context-assembler.ts`)**
   - Single entry point `assembleChatContext(request)` returning `{ messages, systemPrompt, summary, retrievedMessages, tokenBudget, estimatedInputTokens, excludedMessageIds, strategy, diagnostics }`.
   - Handles `"new" | "edit" | "regenerate"`, attachment budget capping, and chronological ordering.

7. **Integration (`app/api/chat/route.ts`)**
   - Replace naive `messages.slice(-MAX_HISTORY_MESSAGES)` with `assembleChatContext(...)`.
   - Trigger background/non-blocking summary update when compaction threshold is reached.
   - Log safe diagnostics (no raw user prompts or document contents).

8. **Testing & QA**
   - Comprehensive unit/integration tests in `__tests__/phase3-5-context.test.ts`.
   - Full validation (`bun test`, `prisma validate`, `tsc --noEmit`, `npm run lint`, `npm run build`).
   - Real browser QA across workflows and viewports.
