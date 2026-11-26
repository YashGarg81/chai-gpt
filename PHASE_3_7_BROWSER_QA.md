# Phase 3.7 — Browser QA

**Target:** `http://localhost:3000`

| Scenario | Status | Details |
| :--- | :--- | :--- |
| 1. Open Chat Controls | **PASS** | Opened on `/c/cmwxb0kvs0003roun1ysi0dwj` (Desktop screenshot: `steps/579/media_0.png`) |
| 2. Change Model & Save | **PASS** | Changed Model to `Gemini 2.5 Flash` and saved |
| 3. Refresh & Persistence | **PASS** | Reloaded page, reopened Chat Controls, `Gemini 2.5 Flash` persisted |
| 4. Custom System Prompt Persistence | **PASS** | Saved `"Always end your reply with [Phase3.7-OK]"`, reloaded, verified persistence, and restored |
| 5. Live Generation with Custom Prompt | **PASS** | Sent `"Say hello briefly."` with `"Always end your reply with [Phase3.7-OK]"`; AI replied `"Hello! [Phase3.7-OK]"` |
| 6. Per-Conversation Isolation | **PASS** | `/c/cmwxaqg8v0002rounfdl0470t` retained `OpenRouter Free (Auto)` |
| 7. Reset Model | **PASS** | Reset `/c/cmwxb0kvs0003roun1ysi0dwj` back to `OpenRouter Free (Auto)` |
| 8. Mobile (`390x844`) Layout | **PASS** | Dialog rendered cleanly without overflow (`steps/565/media_0.png`) |
| 9. Two-user Settings Isolation (Edge) | **NOT TESTED** | Automated in `phase3-7-controls.test.ts` / owner-scoped `userId: user.id` in `settings/route.ts` |
| 10. Console & Network Errors | **PASS** | 0 console errors |
