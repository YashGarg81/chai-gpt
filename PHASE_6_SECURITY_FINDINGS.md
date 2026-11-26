# Phase 6 — Security Findings Register

| ID | Area | Severity | Status | Details & Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **F-01** | `next.config.ts` | **MEDIUM** | **RESOLVED** | Missing HTTP security headers. Added `async headers()` in `next.config.ts` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`), verified live via `curl.exe -I -s http://localhost:3000/sign-in` and `__tests__/phase6-security-hardening.test.ts`. |
| **F-02** | `next` (`16.2.10` -> `16.4.6`), `postcss`, `sharp`, & 25 transitive advisories | **CRITICAL / HIGH** | **RESOLVED** | Ran `npm audit fix` and upgraded `next` & `eslint-config-next` to `16.4.6`. |
| **F-03** | `effect` (`<=3.22.0` via `prisma@7.10.1` `@prisma/config`) | **HIGH** | **RESOLVED** | Added `"effect": "3.22.1"` override in `package.json`; verified with `npx prisma validate`, `npx prisma migrate status`, and `npm audit --omit=dev --audit-level=high` (`found 0 vulnerabilities`). |
| **F-04** | `katex` (`0.11.0 - 0.18.1` via `streamdown` / `mermaid`, `GHSA-238p-pmpm-9mq7`) | **HIGH** | **RESOLVED** | Added `"katex": "0.18.2"` override in `package.json`; verified with `bun test` (including math/markdown/XSS suites), `npx next build --webpack`, and `npm audit --omit=dev --audit-level=high` (`found 0 vulnerabilities`). |
