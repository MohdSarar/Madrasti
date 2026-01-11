# Madrasti Frontend Part 1 — Patch Notes

This zip contains **ONLY** new/updated files (no full repo).

## Apply
1. Unzip at the same level as your repo so paths merge into `Madrasti/`.
2. Review changes, then run:
   - `powershell -ExecutionPolicy Bypass -File .\FRONTEND-VERIFY-STRICT.ps1`

## What was done (Checklist)

High Priority
- NotesTable: `isLoading` prop is now **optional** (safer API).
- Added test types to `frontend/tsconfig.json` (Vitest + jest-dom).
- Providers: already integrated in `frontend/app/layout.tsx` (no change needed).
- Duplicate PostCSS config: provided cleanup script `frontend/tools/cleanup-frontend.ps1` and auto-run in start script.
- Documented token storage limitation (`localStorage`) in `frontend/docs/SECURITY.md`.
- Added middleware-based route protection (`frontend/middleware.ts`).
- Converted root page to a **Server Component** using cookies (`frontend/app/page.tsx`).

Medium Priority
- Added error boundaries: `app/error.tsx`, `app/(dashboard)/error.tsx`, `app/(auth)/error.tsx`.
- Added loading states: `app/loading.tsx`, `app/(dashboard)/loading.tsx`, `app/(auth)/loading.tsx`.
- Improved validation messages on login form (French).
- Added `.env` validation with Zod: `frontend/lib/env.ts` and used in `frontend/lib/api/client.ts`.

Nice to Have
- Added an extended orchestration script: `start-madrasti-extended.ps1`.

## Start script
Run (from repo root):
- `./start-madrasti-extended.ps1 -Verify`
