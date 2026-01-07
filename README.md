# Madrasti — Auth Service (Steps 1, 2 & Platform Step 3 Ready)

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

- **STEP 1** — Auth Service Foundation
- **STEP 2** — Auth Hardening & Quality (Enterprise-grade)
- **STEP 3** — Platform & Infrastructure Readiness (Completed)

The Auth service is a core foundational brick of Madrasti: secure, observable, testable, and production-ready by design.

> Specs based on Madrasti technical blueprint (Jan 2025)  
> Architecture details: `docs/ARCHITECTURE.md`

---

## Features

### Authentication & Sessions

- Email + password authentication
- JWT Access Token (short-lived)
- Refresh Token sessions (hashed, stored in PostgreSQL)
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
- Per-user rate limiting (not IP-only)
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

**Enables detection of:**

- Brute-force attacks
- Tenant abuse
- 2FA bypass attempts
- Session flooding

Endpoint: `/metrics`

### Audit Logs

- Structured JSON audit logs for auth-sensitive routes
- No secrets logged (passwords / OTPs)
- Outcome + domain error codes
- User, tenant, IP, UA, duration captured
- SOC-style audit readiness

### Error Model

- Domain-driven `AuthError`
- Typed error codes
- Factory methods
- Security-aware metadata
- Stable contract for frontend SDKs & audits

---

## Platform & Infrastructure Validation (Step 3)

Step 3 validates that the Auth service operates correctly inside the full platform runtime.

### Infrastructure Guarantees

- Deterministic Docker Compose startup
- Postgres & Redis dependency enforcement
- Health-driven readiness (`/readyz`)
- Graceful failure when dependencies are unavailable
- Consistent metrics exposure

### Smoke & Verification Tooling

Included PowerShell scripts:

- `STEP3-VERIFY.ps1` — standard infra validation
- `STEP3-VERIFY-STRICT.ps1` — exhaustive infra & runtime verification

**They validate:**

- Docker & Compose sanity
- Container health states
- Host-level ports (Postgres, Redis, Kong)
- Direct service endpoints (`/health`, `/readyz`, `/metrics`)
- In-network DNS + HTTP routing
- Kong proxy & admin configuration

These scripts are deterministic, CI-friendly, and reproducible.

---

## Quality Gates (CI-ready)

- TypeScript strict mode enabled (real strictness)
- TypeScript-aware ESLint
- Jest unit + integration tests
- Coverage thresholds enforced
- Pipeline fails if quality gates are not met

---

## Load Testing (k6)

Step 2 includes auth performance proof using k6:

```
services/auth/tests/load/
├── auth-login.js    # baseline
└── auth-stress.js   # breaking point
```

Executed via Docker (`grafana/k6`) against the Auth service.

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
- `GET /readyz`
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
  --network madrasti_default \
  -v ./services/auth/tests/load:/scripts \
  grafana/k6 run /scripts/auth-login.js
```

---

## Roadmap

### STEP 1 — Auth Foundation
**Status:** Complete

### STEP 2 — Auth Hardening & Quality
**Status:** Complete

### STEP 3 — Platform & Infra Readiness
**Status:** Complete

### STEP 4 — Web UI & Functional Flows
**Status:** Next

- Frontend integration
- End-to-end auth flows
- Cross-service authorization enforcement

### STEP 5 — Security & Compliance
**Status:** Planned

- Account lockout policies
- Email verification & password reset
- GDPR minimization & revocation

### STEP 6 — Scale & Ops
**Status:** Planned

- Horizontal scaling
- Redis clustering
- Centralized logging & alerting

---

## Notes for Contributors

- No shortcuts were taken.
- Architecture choices are intentional.
- Designed for audits, scaling, and long-term operation.
- Auth is treated as a platform security primitive, not a feature.

---

## Author

**Mohammed Adel** — CEO & Founder @ Madel Data  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mohd2adel/)

*Data Engineering & AI Consultancy | Building scalable EdTech solutions for MENA*