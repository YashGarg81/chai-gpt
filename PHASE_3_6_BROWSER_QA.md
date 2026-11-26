# Phase 3.6 — Browser QA

**Target:** `http://localhost:3000/c/cmwxb0kvs0003roun1ysi0dwj`

| Workflow | Action | Expected | Actual | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Workflow A — Export** | Clicked `Export` button in header | Export dialog opens with `MD`, `PDF`, `JSON`, `TXT` options | Dialog opened with all 4 formats & options | **PASS** |
| **Workflow B — Share** | Clicked `Share` -> `Create Share Link` -> opened `/share/8jKpCS4kf4XvFjnxOLcAs7C9CvypD9tcTmzUkWFcBkQ` in new tab | Share link created & public viewer renders | Link created (`main · Active`) & opened cleanly | **PASS** |
| **Workflow C — Revocation** | Clicked `Revoke share` -> reloaded `/share/...` | Access rejected (`410`) with revoked message | Returned `410 (Gone)` and rendered `Unavailable` / `Share link has been revoked` | **PASS** |
