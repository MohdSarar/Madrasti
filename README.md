# Madrasti — Auth Service (Steps 1 & 2 Complete)

![Node.js](https://img.shields.io/badge/node-20.x-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-strict-blue)
![Docker](https://img.shields.io/badge/docker-compose-blue)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)
![Redis](https://img.shields.io/badge/redis-7-red)
![Tests](https://img.shields.io/badge/tests-jest%20%2B%20supertest-green)
![Coverage](https://img.shields.io/badge/coverage-gated-important)
![Security](https://img.shields.io/badge/security-enterprise--grade-critical)
![Observability](https://img.shields.io/badge/observability-prometheus-orange)

---

## Overview

This repository contains the **Auth Service** of the **Madrasti platform** (private schools SaaS – Egypt & MENA), covering:

- 🟢 **STEP 1 — Auth Service Foundation**
- 🟡 **STEP 2 — Auth Hardening & Quality (Enterprise-grade)**

The service is designed as a **foundational brick** for the entire Madrasti ecosystem: secure, observable, testable, and scalable by design.

> Specs based on Madrasti technical blueprint (Jan 2025).  
> Architecture details: `docs/ARCHITECTURE.md`

---

## Features

### Authentication & Sessions

- Email + password authentication
- JWT **Access Token** (short-lived)
- **Refresh Token sessions** (hashed, stored in PostgreSQL)
- Automatic refresh rotation
- Logout = session invalidation

### Multi-Tenancy

- School / tenant isolation
- Tenant enforcement via headers + JWT claims
- Super-admin cross-tenant access
- Tenant abuse detection (metrics + audit logs)

### Roles & Access

- `super_admin`
- `school_admin`
- `teacher`
- `parent`
- `student`
- RBAC-ready design

### 2FA (Two-Factor Authentication)

- TOTP (RFC 6238, Google Authenticator compatible)
- Phone OTP (mock/dev provider)
- Mandatory 2FA for staff roles (configurable)
- Setup → verify → enforce flow

### Device & Rate Limits

- Max active devices per user
- Per-endpoint rate limiting
- **Per-user rate limiting** (not IP-only)
- Protection against brute-force & device flooding

---

## Observability & Security (Step 2)

### Metrics (Prometheus)

All security-critical paths are instrumented:

- `auth_login_attempts_total`
- `auth_refresh_attempts_total`
- `auth_2fa_challenges_total`
- `auth_device_limit_rejects_total`
- `auth_active_sessions_total`
- `auth_tenant_access_attempts_total`

➡️ Enables detection of:

- Brute-force attacks  
- Tenant abuse  
- 2FA bypass attempts  
- Session flooding  

Endpoint: `/metrics`

### Audit Logs

- Structured JSON audit logs for auth-sensitive routes
- No secrets logged (passwords / OTPs)
- Outcome + error codes (SOC-style ready)
- User, tenant, IP, UA, duration captured

### Error Model

- **Domain-driven `AuthError`**
- Typed error codes
- Factory methods
- Security-aware metadata
- Consistent responses for frontend SDKs & audits

---

## Quality Gates (CI-ready)

- TypeScript **strict mode enabled** (real strictness)
- TypeScript-aware ESLint (no cosmetic linting)
- Jest unit + integration tests
- **Coverage thresholds enforced**
- Pipeline fails if quality gates are not met

---

## Load Testing (k6)

Step 2 includes **auth performance proof** using k6:
```
services/auth/tests/load/
├── auth-login.js    # baseline
└── auth-stress.js   # breaking point
```

Executed via Docker (`grafana/k6`) against the auth service.

---

## Local Quick Start
```bash
cp .env.example .env
docker compose up -d --build

# Run migrations
docker compose exec auth npm run migrate

# Create super admin (dev only)
docker compose exec auth npm run dev:create-super-admin

# Optional seed
docker compose exec auth npm run seed
```

Service available at: **http://localhost:8081**

### Key Endpoints

- `POST /v1/super-admin/schools`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `POST /v1/auth/2fa/setup`
- `POST /v1/auth/2fa/verify`
- `POST /v1/auth/phone/request-otp`
- `POST /v1/auth/phone/verify-otp`
- `GET /health`
- `GET /healthz`
- `GET /metrics`

---

## Tests
```bash
docker compose exec auth npm run lint
docker compose exec auth npm run test:coverage
```

### Load Tests
```bash
docker run --rm \
  --network madrasti_hardened_default \
  -v ./services/auth/tests/load:/scripts \
  grafana/k6 run /scripts/auth-login.js
```

---

## Roadmap

### ✅ STEP 1 — Auth Foundation
Complete.

### ✅ STEP 2 — Auth Hardening & Quality
Complete.

### 🔵 STEP 3 — Platform Integration (Next)

- Public Auth SDK
- Token verification middleware for other services
- Integration with School Service
- Tenant provisioning hooks

### 🔴 STEP 4 — Security & Compliance

- Account lockout policies
- Email verification & password reset
- GDPR minimization & revocation

### 🟣 STEP 5 — Scale & Ops

- Horizontal scaling
- Redis clustering
- Centralized logging & alerting

---

## Notes for Contributors

- No shortcuts were taken.
- Architecture choices are intentional and extensible.
- The Auth service is a long-term foundational component.
- Designed for team scaling, audits, and production operations.

---

## Next Steps

**Suggested documentation additions:**

- `docs/STEP_3.md` — Platform integration guide
- `docs/SECURITY.md` — Security model & threat analysis
- `docs/OBSERVABILITY.md` — Monitoring & alerting setup