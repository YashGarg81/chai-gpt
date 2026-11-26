# Phase 5 — API Documentation

| Endpoint | Methods | Auth | Validation | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/api/profile` | `GET` | `auth.protect()` + `requireUser()` | N/A | `{ firstName, lastName, email, imageUrl, bio, defaultModel, themePreference, createdAt }` |
| `/api/profile` | `PATCH` | `auth.protect()` + `requireUser()` | `validateProfileUpdate()` (`firstName`/`lastName` <= 60, `bio` <= 500, `defaultModel` allowlist, `themePreference` enum) | Updated profile JSON (`200`) or `{ error }` (`400`) |
