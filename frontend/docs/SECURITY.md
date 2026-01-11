# Frontend Security Notes (Madrasti)

This frontend is currently a **MVP dev/staging** implementation.

## Token storage (current limitation)

Today, the UI stores `access_token` and `refresh_token` in **`localStorage`** (see `frontend/lib/api/client.ts` and `frontend/lib/stores/auth-store.ts`).

**Implications**
- `localStorage` is accessible from JavaScript.
- If the app ever suffers from **XSS**, tokens can be exfiltrated.
- Middleware / Server Components cannot read `localStorage`.

**Temporary mitigation used**
- On login we also set a **non-HttpOnly cookie** (`madrasti_at`, `madrasti_rt`) to allow middleware to protect routes.
- This cookie is still readable by JS → it is **not** a full security solution.

## Enterprise-grade target (recommended)

For production, move to a BFF / auth gateway pattern:
- Tokens stored server-side and/or in **HttpOnly Secure cookies**
- Refresh rotation handled server-side
- CSRF protection where needed
- CSP hardened (no unsafe-inline), audit of any HTML injection points
- Central session invalidation and device/session management (backend already supports this)

## Action items for production hardening
- Replace localStorage tokens with **HttpOnly cookies**
- Add strict CSP, remove `unsafe-inline` where possible
- Add Sentry (or equivalent) + alerting
- Add dependency auditing in CI (`npm audit` / `pnpm audit` / SCA tool)
