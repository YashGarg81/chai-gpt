# Phase 4 — Initial Gap Analysis

| Capability | Classification | Notes |
| :--- | :--- | :--- |
| 4.1 Document Understanding (PDF/DOCX/TXT/CSV) | **Already implemented & verified** | Phase 3.4 extraction + Phase 3.5 bounded attachment context |
| 4.2 Image Understanding | **Already implemented & verified** | Phase 3.4 image upload + base64 multimodal payload |
| 4.3 Web Search with Citations | **Missing** | Need provider-abstracted web search (`web-search.ts`) + citation framing |
| 4.4 Advanced File Analysis | **Implemented (basic)** | Enhanced via deterministic CSV analyzer |
| 4.5 Code Generation & Formatting | **Already implemented & verified** | Streamdown `@streamdown/code` + copy buttons |
| 4.6 Data Analysis (CSV) | **Missing** | Need deterministic `csv-analyzer.ts` (stats, missing values, formula-injection safety) |
| 4.7 Advanced Context Management | **Already implemented & verified** | Phase 3.5 `context-assembler.ts` |
| 4.8 Long Conversation Summarization | **Already implemented & verified** | Phase 3.5 `summarization.ts` + `ConversationSummary` |
| 4.9 Tool Calling & Structured Responses | **Missing** | Need server-side `tool-registry.ts` with validated schemas & timeouts |
