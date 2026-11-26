# Phase 3.8 — Browser QA Summary

All core user journeys were verified in real browser sessions against `http://localhost:3000`:
- **Chat & Streaming**: **PASS** (multi-turn context recall, regeneration, custom system prompt `[Phase3.7-OK]`)
- **Attachments**: **PASS** (`phoenix-attachment-35.txt` upload, grounded Q&A, reload & navigation persistence, authorized download)
- **Two-User Isolation (Chrome User A vs Edge User B)**: **PASS** (Edge User B received `404` on User A's conversation and attachment)
- **Export & Sharing**: **PASS** (Export dialog, Share link creation, public `/share/...` viewer, Revocation `410 Gone`, Unicode PDF visual check)
- **Chat Controls**: **PASS** (Model switch, reload persistence, per-conversation isolation, reset, mobile `390x844` & desktop screenshots)
- **Responsive Layout**: **PASS** (`1920x1080`, `1440x900`, `1366x768`, `768x1024`, `390x844`, `360x800`)
