# Phase 3.5 — Final Browser QA

**Target:** `http://localhost:3000`

| Test ID | Conversation / Branch | User Action | Expected | Actual | Status | Console Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Test 1** | `/c/cmwxaqg8v0002rounfdl0470t` (Original) | Sent 3 synthetic fact turns (`8443`, `120 seconds`, photosynthesis) then asked `"What deployment port and cache TTL did we decide earlier?"` | AI recalls `8443` and `120 seconds` | Recalled `"Deployment port: 8443"` and `"Cache TTL: 120 seconds"` | **PASS** | 0 |
| **Test 2** | `/c/cmwxaqg8v0002rounfdl0470t` (Original) | Clicked `"Regenerate response"` on the recall answer | UI updates cleanly, streams new response, no stale content | Streamed fresh response (`"Here is what we established earlier: Deployment port: 8443, Cache TTL: 120 seconds"`) | **PASS** | 0 |
| **Test 3 (Test A)** | `/c/cmwxb0kvs0003roun1ysi0dwj` | Uploaded `phoenix-attachment-35.txt` (`34 B`), asked `"What is the project code in my attachment?"`, refreshed, navigated away & back | Attachment chip visible, AI recalls `PhoenixAttachment35`, attachment card persists | AI recalled `PhoenixAttachment35` (while treating attachment as untrusted data); attachment card (`/api/attachments/cmwxb4unp0004roun88tv7qj1`) persisted after reload & navigation | **PASS** | 0 |
| **Test 4** | `/c/cmwxaqg8v0002rounfdl0470t` & `/c/cmwxb0kvs0003roun1ysi0dwj` | Checked console messages | 0 console errors / failed network requests | 0 console errors | **PASS** | 0 |
| **Test 5 (Test B)** | `/c/cmwxb0kvs0003roun1ysi0dwj` | User B (Edge) attempted to open User A's (Chrome) conversation & attachment (`/api/attachments/cmwxb4unp0004roun88tv7qj1`) | Unauthorized access rejected (`404`/`403`) without exposing private data | Returned `404` on conversation and `404` (`Attachment not found`) on attachment for User B in Edge | **PASS** | 0 |
