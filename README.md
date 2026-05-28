<p align="center">
  <img src="https://img.shields.io/badge/Madrasti-مدرستي-0ea5e9?style=for-the-badge&labelColor=0f172a" alt="Madrasti"/>
</p>

<p align="center">
  <strong>Enterprise School Management Platform for MENA Private Schools</strong><br/>
  Multi-tenant · Arabic-first · Microservices · Event-driven
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Kong-3.7-003459?logo=kong&logoColor=white" alt="Kong"/>
  <img src="https://img.shields.io/github/actions/workflow/status/mohd2adel/madrasti/ci.yml?label=CI&logo=github" alt="CI"/>
</p>

---

## Overview

**Madrasti** (مدرستي — "my school") is a comprehensive, production-ready school management platform purpose-built for private schools across Egypt and the MENA region.

It supports **multiple schools on a single installation**, each with complete data isolation. Schools are independently managed by one or more administrators, and teachers and students belong exclusively to their school's tenant scope.

### Core Capabilities

| Domain | Features |
|--------|----------|
| **Multi-tenancy** | Complete school isolation by `school_id` on every row; one platform, unlimited schools |
| **Authentication** | JWT (access + refresh), 2FA (TOTP), email verification, device management, RBAC |
| **School Management** | School provisioning, academic years, grade levels, class sections |
| **Student Management** | Enrollment, health records, parent linkage, transport & meal plans |
| **Academic** | Subjects, assessments, grade entry, GPA calculation, performance analytics |
| **Attendance** | Daily marking, auto-marking cron, leave requests, absence reasons |
| **Scheduling** | Class timetables, conflict detection, teacher assignment |
| **Documents** | S3/MinIO file storage, folder organisation, role-based access control |
| **Notifications** | Real-time WebSocket, event-driven notifications to parents/teachers |
| **Reporting** | PDF generation, attendance reports, academic performance exports |
| **Security** | Audit logging, password policies, account lockout, GDPR support |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend  (Next.js 14)                    │
│          http://localhost:3000  —  App Router + RSC         │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────┐
│              Kong API Gateway  (:8000)                      │
│    /auth  /student  /school  /profile  /academic            │
│    /attendance  /scheduling  /reporting                     │
│    /notification  /document  /security                      │
└────────────────────────────┬────────────────────────────────┘
                             │ internal docker network
          ┌──────────────────┼──────────────────┐
          │                  │                  │
 ┌────────▼────────┐ ┌───────▼───────┐ ┌───────▼───────┐
 │  Auth   :8081   │ │ Security:8091 │ │ Student :8082 │
 │ School  :8083   │ │  (audit, ACL) │ │ Profile :8084 │
 │ Academic:8085   │ └───────────────┘ │ Attend. :8086 │
 │ Sched.  :8087   │                   │ Report. :8088 │
 │ Notify. :8089   │                   │ Document:8090 │
 └────────┬────────┘                   └───────┬───────┘
          │                                    │
 ┌────────▼────────────────────────────────────▼───────┐
 │          PostgreSQL 16 (:5432)  +  Redis 7 (:6379)  │
 │         Event Bus (Redis Streams)  ·  Cache/Sessions │
 └─────────────────────────────────────────────────────┘
```

**Tech Stack**

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS, Radix UI, Zustand |
| Backend | Node.js 20, TypeScript, Express, Pino, Prometheus metrics |
| Database | PostgreSQL 16 (shared schema, `school_id` tenant isolation) |
| Cache / Events | Redis 7 (sessions, rate limiting, Redis Streams event bus) |
| API Gateway | Kong 3.7 (DB-less declarative, CORS, rate limiting) |
| Auth | JWT (RS256 / HS256), Argon2id, TOTP 2FA, refresh token rotation |
| Build | Docker, Docker Compose, TypeScript compilation |
| Testing | Node.js built-in test runner, Supertest, Vitest, Playwright |
| CI/CD | GitHub Actions |

---

## Multi-School Model

Every resource in Madrasti carries a `school_id` foreign key. Middleware enforces tenant scoping on every authenticated request — users can only read and write data that belongs to their own school.

```
schools
  └── users         (school_admin, teacher, parent, student)
        └── students
              ├── attendance_records
              ├── grades
              └── leave_requests
  └── academic_years
        └── academic_periods
              └── assessments
  └── grade_levels
        └── classes
              └── schedules
```

**Roles and permissions**

| Role | Scope |
|------|-------|
| `super_admin` | Platform-wide; manages schools and billing |
| `school_admin` | Full control within their school |
| `teacher` | Read/write within assigned classes |
| `parent` | Read-only access to their child's data |
| `student` | Read-only access to their own data |

---

## Quick Start

### Prerequisites

- **Docker Desktop** (running) — [download](https://www.docker.com/products/docker-desktop)
- **Node.js 20.x** — [download](https://nodejs.org)
- **PowerShell 5.1+** (included in Windows 10/11)

### One-command setup

```powershell
.\scripts\madrasti.ps1 setup
```

This single command:
1. Checks prerequisites (Docker, Node, npm)
2. Creates `.env` from `.env.example`
3. Creates `frontend/.env.local`
4. Installs all dependencies
5. Starts all backend services via Docker Compose
6. Runs a full health check

Then start the frontend:

```powershell
cd frontend
npm run dev
```

Open **http://localhost:3000**

---

## Management Script

All platform operations are handled by a single unified script:

```powershell
.\scripts\madrasti.ps1 <command> [service]
```

| Command | Description |
|---------|-------------|
| `setup` | First-time installation and startup |
| `start` | Start all Docker services + frontend (new window) |
| `stop` | Stop all Docker services |
| `restart [service]` | Restart all or a specific service |
| `status` | Show Docker Compose service status |
| `health` | Full system health check (all 11 services + Kong) |
| `test` | Run all package and service tests |
| `logs [service]` | Tail logs (all services or a specific one) |
| `clean` | Remove containers, volumes, and local images |

**Examples**

```powershell
.\scripts\madrasti.ps1 health
.\scripts\madrasti.ps1 logs auth
.\scripts\madrasti.ps1 restart school
.\scripts\madrasti.ps1 test
```

---

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js dev server |
| Kong Proxy | 8000 | API Gateway (all client traffic) |
| Kong Admin | 8001 | Kong admin API (dev only) |
| Auth | 8081 | Authentication, JWT, 2FA |
| Student | 8082 | Student records and enrollment |
| School | 8083 | School provisioning and structure |
| User Profile | 8084 | User profiles and preferences |
| Academic | 8085 | Grades, GPA, subjects |
| Attendance | 8086 | Daily attendance and leave |
| Scheduling | 8087 | Timetables and conflict detection |
| Reporting | 8088 | PDF and Excel report generation |
| Notification | 8089 | WebSocket + push notifications |
| Document | 8090 | File storage (S3/MinIO) |
| Security | 8091 | Audit log, password policy, lockout |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache, sessions, event bus |

---

## Development

### Backend only

```powershell
docker compose up -d
```

### Frontend only (after backend is running)

```powershell
cd frontend
npm run dev
```

### Environment variables

```powershell
# Backend
cp .env.example .env
# Edit .env — never commit secrets

# Frontend
cp frontend/.env.example frontend/.env.local
```

Key variables:

```env
# .env
POSTGRES_USER=madrasti
POSTGRES_PASSWORD=madrasti
POSTGRES_DB=madrasti
DATABASE_URL=postgres://madrasti:madrasti@postgres:5432/madrasti
JWT_ACCESS_SECRET=<at-least-32-chars-in-production>
JWT_REFRESH_SECRET=<at-least-32-chars-in-production>

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8089
```

---

## Testing

```powershell
# All packages and services
.\scripts\madrasti.ps1 test

# Individual service
npm -w @madrasti/auth-service test
npm -w @madrasti/student-service test

# Frontend unit tests
cd frontend && npm test

# Frontend e2e (requires running backend)
cd frontend && npm run test:e2e
```

---

## Production Deployment

### 1. Prepare secrets

```bash
cp .env.example .env.production
# Fill in strong secrets, production DB credentials, S3 config
```

### 2. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Key production differences vs dev

| Setting | Development | Production |
|---------|-------------|------------|
| Service command | `npm run dev` (tsx watch) | `npm run start` (compiled JS) |
| Kong Admin API | Exposed on :8001 | Bound to 127.0.0.1 only |
| Redis auth | No password | `REDIS_PASSWORD` required |
| Trust Proxy | Disabled | `TRUST_PROXY=1` |
| Secrets validation | Relaxed | >= 32 chars enforced |
| Container restart | No | `unless-stopped` |
| Resource limits | None | Memory limits per service |

### 4. Scaling

```bash
docker compose -f docker-compose.prod.yml up -d --scale student=3 --scale auth=2
```

---

## Health Monitoring

```powershell
# Full health check
.\scripts\madrasti.ps1 health

# Individual service
curl http://localhost:8081/health    # auth
curl http://localhost:8000/auth/health  # through Kong

# Service metrics (Prometheus)
curl http://localhost:8081/metrics

# Container logs
.\scripts\madrasti.ps1 logs auth
docker compose logs -f --tail 50 auth
```

---

## Repository Structure

```
madrasti/
├── services/               # 11 microservices (Node.js + TypeScript)
│   ├── auth/               # Authentication, JWT, 2FA
│   ├── student/            # Student management
│   ├── school/             # School provisioning
│   ├── user-profile/       # User profiles
│   ├── academic/           # Grades, GPA, subjects
│   ├── attendance/         # Attendance tracking
│   ├── scheduling/         # Timetables
│   ├── reporting/          # PDF/Excel reports
│   ├── notification/       # WebSocket notifications
│   ├── document/           # File storage (S3)
│   └── security/           # Audit, lockout, GDPR
├── packages/               # Shared internal libraries
│   ├── auth-sdk/           # Auth middleware and client
│   ├── event-bus/          # Redis Streams event bus
│   └── security-sdk/       # Security utilities
├── frontend/               # Next.js 14 App Router
├── infra/
│   ├── kong/               # Kong declarative config
│   └── postgres/init/      # DB init and migration runner
├── scripts/
│   └── madrasti.ps1        # Unified platform CLI
├── docs/                   # Architecture and workflow docs
├── docker-compose.yml      # Development stack
├── docker-compose.prod.yml # Production stack
└── .env.example            # Environment variable template
```

---

## Roadmap

### Completed (v0.1 — Jan 2026)
- [x] Microservices architecture with API Gateway
- [x] Multi-tenant school isolation
- [x] Authentication (JWT, 2FA, email verification)
- [x] Student, school, academic, attendance management
- [x] Document storage, scheduling, reporting, notifications
- [x] Security audit log and account lockout

### Upcoming (Q2–Q3 2026)
- [ ] Parent mobile application (React Native)
- [ ] AI-powered academic insights
- [ ] Advanced analytics dashboard
- [ ] Payment and billing integration
- [ ] Full Arabic RTL UI
- [ ] WhatsApp notification integration

---

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Git Workflow](./docs/WORKFLOW_GIT.md)
- [Changelog](./CHANGELOG.md)

---

## Author

**Mohammed Adel** — CEO & Founder, Madel Data  
*Data Engineering & AI Consultancy · Scalable EdTech for MENA*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mohd2adel/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohd2adel)
[![Email](https://img.shields.io/badge/Email-Contact-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:md.abusarar@gmail.com)

---

<p align="center">
  Built with TypeScript · Powered by PostgreSQL & Redis · Deployed with Docker
</p>
