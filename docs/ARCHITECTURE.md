# Madrasti — Architecture (MVP)

## Global target architecture (end-state)

The MVP specs describe a **multi-tenant** (school = tenant) platform with:
- Presentation layer: Web (React) + Mobile (React Native) + Admin portal (React)
- API Gateway (Kong or Nginx) for auth, rate limiting, load balancing
- Services (Node.js): Auth, Student Mgmt, Academic Mgmt, Finance, Communication, Attendance, Transport, Analytics
- Data layer: PostgreSQL (primary), Redis (cache), MongoDB (logs/docs), S3/MinIO (files)

This matches the architecture diagram and principles in the specs:
- Microservices modularity
- Tenant isolation with `school_id` / `tenant_id`
- Mobile-first + PWA

## Step 1 scope (what is implemented now)

**We implement the foundation + Auth Service (P0)**:
- Local environment: PostgreSQL + Redis + auth
- Auth capabilities:
  - School onboarding created by `super_admin`
  - RBAC roles consistent with the spec
  - Email/password login + refresh sessions
  - TOTP 2FA for staff roles
  - Optional phone OTP flow (mocked provider in dev)

## Data model (Auth DB)

We align tables with the specs:
- `schools` (tenants)
- `users` (linked to `schools`)
- `user_sessions` (refresh token sessions)

## Next steps

- Step 2: API Gateway + shared libraries (logging, auth middleware), “Student Mgmt” service and cross-service tenant contract.
- Step 3: Academic Mgmt (timetable, grades, attendance).
- Step 4: Communication + Notifications.
- Step 5: Finance + local payments integrations (Fawry/Aman/cards).
- Step 6: Frontends (web admin + parent/student).
- Step 7: Observability (metrics, tracing), security hardening, backups.
