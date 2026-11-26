# Phase 3.4 — Streaming State Fix
- `toUIMessageStream` receives `cleanRecentMessages` and `abortSignal: req.signal`, ensuring clean completion, cancellation, and persistence without duplicating or leaking internal attachment payloads.
