# Phase 6 — Browser Acceptance Report

| Check | Status | Evidence |
| :--- | :--- | :--- |
| Unauthenticated API rejection | **PASS** | `curl.exe -i -s` on `GET` and `PATCH /api/profile` returned `HTTP/1.1 307 Temporary Redirect` -> `/sign-in?redirect_url=...`, `x-clerk-auth-status: signed-out`. |
| Two-user isolation (Account A & B) | **PASS** | Account A (`recording_43.mp4`) and Account B (`recording_44.mp4`) rendered strictly isolated `/dashboard` data with 0 console errors. |
| Protected-field mass-assignment | **PASS** | Live `PATCH /api/profile` returned `HTTP 200` with `email` unchanged and DB rows for Account A & B verified intact. |
