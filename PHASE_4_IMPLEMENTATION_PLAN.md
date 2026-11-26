# Phase 4 — Implementation Plan

1. **Web Search Abstraction (`features/search/utils/web-search.ts`)**:
   - Provider interface `WebSearchProvider` with `DuckDuckGoInstantProvider` (zero-key fallback) and `TavilySearchProvider` (when `TAVILY_API_KEY` is set).
   - SSRF-safe URL validation (`https://` only, no private IPs) and untrusted-content framing.
2. **Deterministic CSV Analyzer (`features/analysis/utils/csv-analyzer.ts`)**:
   - Parses CSV safely (bounded rows), detects column types (`number`, `string`, `empty`), counts missing values, computes `min`, `max`, `mean`, `sum` for numeric columns, and sanitizes formula-injection prefixes (`=`, `+`, `-`, `@`).
3. **Secure Tool Registry (`features/tools/utils/tool-registry.ts`)**:
   - Explicit allowlisted AI SDK tools (`web_search`) with Zod/type validation, 8s timeout, and safe error responses.
   - Wired into `app/api/chat/route.ts` (`streamText({ tools: getRegisteredChatTools() })`).
4. **Testing & Validation**:
   - Add `__tests__/phase4-capabilities.test.ts` and run full `bun test`, `tsc --noEmit`, `npm run lint`, `npx prisma validate`, `npm run build`.
