# Phase 3.8 — Closure Checklist

### Completed locally
- [x] Phase 3.1–3.7 implementation preserved.
- [x] Phase 3.8 local implementation and remediation preserved.
- [x] Automated regression baseline: 54 passing tests across 15 files (238 `expect()` calls).
- [x] TypeScript validation (`.\node_modules\.bin\tsc --noEmit` -> exit code 0).
- [x] Lint validation (`npm run lint` -> exit code 0).
- [x] Prisma validation (`npx prisma validate` -> exit code 0).
- [x] Next.js production build (`npm run build` -> exit code 0).
- [x] Reported browser regression scenarios (including `Escape`-key dialog closing).
- [x] Local attachment storage and mocked S3 tests.

### Outstanding
- [ ] Automated axe-core accessibility scan.
- [ ] Full focus-management and screen-reader accessibility verification.
- [ ] Live streaming TTFT measurements.
- [ ] Application load and concurrency benchmarks.
- [ ] Live S3/R2 bucket integration.
- [ ] Production Clerk keys and configuration.
- [ ] Production deployment and smoke testing.
