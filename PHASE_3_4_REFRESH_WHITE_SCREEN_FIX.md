# Phase 3.4 — Refresh White-Screen Fix

## Root Cause
1. `ThemeProvider` applied `.dark` / `.light` in `useEffect` after hydration, causing a white background flash before first paint in dark mode.
2. `app/(root)/c/[id]` had no `loading.tsx` or `error.tsx` boundary.

## Fix
1. Added a synchronous pre-paint `<script>` in `app/layout.tsx` (Server Component `<head>`) to apply the stored theme class before first paint without triggering React 19's client-component script warning.
2. Added `bg-background text-foreground` on `<body>`, plus `app/(root)/c/[id]/loading.tsx` and `app/(root)/c/[id]/error.tsx` with a Retry button.
