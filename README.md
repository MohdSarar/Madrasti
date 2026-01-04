# Madrasti — Step 1 (Foundation + Auth Service P0)

This repository contains **Step 1** of the Madrasti platform (MVP for private schools in Egypt):
- Monorepo structure
- Local dev environment via Docker Compose (PostgreSQL + Redis + Auth service)
- **Auth Service** (multi-tenant, RBAC-ready) with:
  - School onboarding (by `super_admin`)
  - Users: `school_admin`, `teacher`, `parent`, `student`, etc.
  - Login (email+password) + refresh token sessions
  - TOTP 2FA (required for staff roles) + optional for others
  - Phone OTP (dev/mock provider included)
  - Rate limiting + basic security headers
  - SQL migrations + seeding scripts

> Based on the MVP technical specs (Jan 2025). See `docs/ARCHITECTURE.md`.

## Quick start (local)

```bash
cp .env.example .env
docker compose up -d --build
# run migrations
docker compose exec auth npm run migrate
# create a super admin (dev)
docker compose exec auth npm run dev:create-super-admin
# seed example school/users (optional)
docker compose exec auth npm run seed
```

Auth service will be available at:
- http://localhost:8081

## Key endpoints

- `POST /v1/super-admin/schools` (super_admin only): create a school tenant + school admin
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `POST /v1/auth/2fa/setup` + `POST /v1/auth/2fa/verify`
- `POST /v1/auth/phone/request-otp` + `POST /v1/auth/phone/verify-otp`

## Environment

See `.env.example` and `services/auth/.env.example`.

## Tests

```bash
docker compose exec auth npm test
```

## Next steps

Step 2 will introduce: API Gateway, shared i18n conventions, core “Student Mgmt” service, and tenant-aware data access conventions across services.
