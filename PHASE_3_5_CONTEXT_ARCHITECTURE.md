# Phase 3.5 — Context Architecture

## Overview
`features/context/` provides a modular, model-aware context management pipeline integrated into `app/api/chat/route.ts`.

## Components
- **`features/context/utils/token-budget.ts`**: Model-aware context registry (`openrouter/free`, `gemini-2.5-flash`, `gpt-4o`), conservative token estimator (ASCII, code, JSON, URLs, Unicode/Hindi, multimodal), and non-overlapping budget allocator.
- **`features/context/utils/security.ts`**: Neutralizes role-spoofing prefixes (`system:`, `developer:`, `assistant:`) and wraps summaries, retrieved snippets, and attachment text as untrusted data.
- **`features/context/utils/retrieval.ts`**: Deterministic lexical + recency-weighted retrieval over older messages outside the recent window, bounded by `retrievalTokens` and restored to chronological order.
- **`features/context/utils/summarization.ts`**: Structured `ConversationSummaryData` (`conversationGoal`, `topics`, `requirements`, `decisions`, `technicalContext`, `importantFacts`, `pendingTasks`, `unresolvedQuestions`, `lastKnownState`, `updatedAt`) with an 8s timeout and deterministic extractive fallback.
- **`features/context/services/context-assembler.ts`**: `assembleChatContext()` orchestrates budget calculation, recent message selection, historical retrieval, summary injection, attachment budget capping, and `updateBranchSummaryInBackground()`.
