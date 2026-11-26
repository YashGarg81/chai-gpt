# Phase 4 — Security Report

- **SSRF Protection (`isSafePublicUrl`)**: Web search rejects `http://`, `localhost`, `127.0.0.1`, `10.x`, `192.168.x`, `169.254.x`, `.local`, and `javascript:` URLs.
- **CSV Formula Injection (`sanitizeCsvCell`)**: Neutralizes `=`, `+`, `-`, `@` prefixes with a leading `'`.
- **Tool Registry (`getRegisteredChatTools`)**: Only explicitly allowlisted tools (`web_search`, `analyze_csv`) with `jsonSchema` validation and bounded inputs can execute; no arbitrary server code execution.
- **Untrusted Data**: Web search snippets are sanitized via `sanitizeUntrustedText()`.
