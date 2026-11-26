# Phase 5 — Audit and Gap Analysis

| Feature | Classification | Notes |
| :--- | :--- | :--- |
| 5.1 Main User Dashboard (`/dashboard`) | **MISSING** | No `/dashboard` route or real-data overview cards exist. |
| 5.2 User Profile Management | **PARTIALLY IMPLEMENTED** | `User` has `firstName`, `lastName`, `email`, `imageUrl` from Clerk; missing `bio` and edit API/UI. |
| 5.3 Personalized Preferences | **PARTIALLY IMPLEMENTED** | `next-themes` handles theme client-side; `SUPPORTED_CHAT_MODELS` exists in `chat-controls.ts`; missing persisted `defaultModel` and `themePreference` on `User`. |
| 5.4 Activity & History Insights | **PARTIALLY IMPLEMENTED** | `Conversation` & `Message` timestamps exist; missing aggregated activity view. |
| 5.5 Usage Analytics | **MISSING** | Can compute real counts (`conversations`, `messages`, `attachments`, `model` distribution) from Prisma; token/cost billing is not stored (disclosed as limitation). |
| 5.6 Account Settings | **PARTIALLY IMPLEMENTED** | Clerk handles auth/sessions; need unified Account section. |
