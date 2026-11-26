# Phase 3.4 — Message Rendering Fix
- `app/api/chat/route.ts`: Separated `cleanRecentMessages` (passed to `toUIMessageStream({ originalMessages })` for persistence and UI) from `recentMessages` (passed to `convertToModelMessages` for Gemini). User message bubbles now show only the user's prompt and attachment chips.
