# Phase 3.8 — Initial Project Audit

## 1. Architecture & Feature Inventory
- **Framework**: Next.js 16.2.10 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4.
- **Database**: PostgreSQL (Neon) via Prisma 7.8.0 (`User`, `ConversationFolder`, `Conversation`, `ConversationBranch`, `Message`, `Attachment`, `ConversationSummary`, `ConversationShare`).
- **Auth**: Clerk (`@clerk/nextjs`) with `auth.protect()` + `requireUser()`.
- **AI**: OpenRouter (`@ai-sdk/openai` + `ai` SDK v7) with `openrouter/free` default and per-conversation model/systemPrompt overrides.
- **Rate Limiting & Locking**: Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`) with fail-closed rate limiting and atomic Lua lock renewal/release.
- **Phases 3.1–3.7**: Conversation CRUD/search/folders, branching/editing/regeneration, Streamdown rendering + XSS hardening, attachments (PDF/DOCX/TXT/CSV/images), context management (token budget, retrieval, rolling summaries), export (MD/TXT/JSON/Unicode PDF) & secure sharing, and advanced chat controls.
