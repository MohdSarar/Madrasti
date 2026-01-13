# Madrasti — Full-Stack EdTech Platform for Private Schools

![Node.js](https://img.shields.io/badge/node-20.x-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-strict-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.2.0-black)
![React](https://img.shields.io/badge/React-18.x-61DAFB)
![Docker](https://img.shields.io/badge/docker-compose-blue)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)
![Redis](https://img.shields.io/badge/redis-7-red)
![Tests](https://img.shields.io/badge/tests-jest%20%2B%20supertest-green)
![Security](https://img.shields.io/badge/security-enterprise--grade-critical)
![Status](https://img.shields.io/badge/Status-Production_Ready-brightgreen)

---

## Overview

**Madrasti** is a comprehensive school management platform designed for private schools in Egypt and the MENA region. Built with enterprise-grade microservices architecture.

**Key Features:**
- 🏗️ 14 microservices architecture
- 🏫 Multi-tenant (complete school isolation)
- 👥 5 user roles with RBAC
- ⚡ Real-time WebSocket notifications
- 🔒 Enterprise security (JWT, 2FA, rate limiting)
- 📊 Academic GPA calculation
- 📅 Attendance tracking with auto-marking
- 📄 Document management (S3)

> **Tech Stack:** Node.js 20 • TypeScript • Next.js 14 • PostgreSQL 16 • Redis 7 • Docker  
> **Architecture:** Event-driven microservices with API Gateway (Kong)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Demo & Presentation Checklist](#demo--presentation-checklist)
- [Features](#features)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Platform Verification](#platform-verification)
- [Deployment](#deployment)

---

## Quick Start

### Prerequisites
- Docker Desktop (running)
- Node.js 20.x+
- PowerShell (Windows)

### One-Click Start
```powershell
.\QUICK-START-DEMO.ps1
```

This script:
- ✅ Starts all 14 backend services
- ✅ Verifies system health
- ✅ Launches frontend (dev mode)
- ✅ Opens http://localhost:3000

---

## Demo & Presentation Checklist

### 🎯 Before Every Demo (30 sec)

**1. Health Check**
```powershell
.\MADRASTI-HEALTH-CHECK.ps1
```
✅ Must show: `✓✓✓ SYSTEM 100% OPERATIONAL ✓✓✓`

**2. Start System** (if not running)
```powershell
.\QUICK-START-DEMO.ps1
```

**3. Access Points**
- 🌐 Frontend: http://localhost:3000
- 🔌 API: http://localhost:8000
- ⚙️ Admin: http://localhost:8001

### 📋 Pre-Demo Checklist
- [ ] Docker Desktop running
- [ ] Health check shows all green ✓
- [ ] Frontend loads
- [ ] Login works
- [ ] Attendance feature works
- [ ] Ports 3000, 8000-8091 free

### 🛠️ Quick Fixes During Demo

| Issue | Fix |
|-------|-----|
| Frontend freeze | `Ctrl+C` → `npm run dev` |
| API 500 | `docker logs madrasti-<service>-1 --tail 50` |
| CORS error | `docker restart madrasti-kong-1` |
| DB issue | `docker restart madrasti-postgres-1` |

### ✨ Features to Demo

**Working MVP Features:**
- ✅ **Attendance** - Daily marking + notifications
- ✅ **GPA** - Automatic academic calculation
- ✅ **Documents** - Upload with access control
- ✅ **Scheduling** - Conflict detection
- ✅ **Notifications** - Real-time WebSocket
- ✅ **Multi-tenant** - School isolation

**Key Metrics:**
- 14 microservices
- 100+ schools capacity
- 50,000+ students capacity
- Sub-second response
- 99.9% uptime target

---

## Features

### 🏫 School Management
- Multi-tenant with complete isolation
- Academic year management
- Class organization

### 👥 User Management
- 5 roles: Super Admin, School Admin, Teacher, Parent, Student
- CRUD operations
- Relationship management

### 📚 Academic
- Grade management
- GPA calculation
- Subject tracking
- Performance analytics

### 📅 Attendance & Scheduling
- Daily attendance tracking
- Auto-marking system
- Schedule conflict detection
- Parent notifications

### 📄 Documents
- S3 file storage
- Role-based access
- Folder organization

### 💬 Communication
- WebSocket notifications
- Internal messaging
- Parent-teacher communication

### 📊 Reporting
- PDF generation
- Attendance reports
- Academic performance
- Excel export

---

## Architecture

```
Frontend (Next.js 14)
       ↓
Kong Gateway (8000)
       ↓
┌──────────────────────────┐
│  14 Microservices:       │
│  - Auth (8081)           │
│  - Student (8082)        │
│  - School (8083)         │
│  - User Profile (8084)   │
│  - Academic (8085)       │
│  - Attendance (8086)     │
│  - Scheduling (8087)     │
│  - Reporting (8088)      │
│  - Notification (8089)   │
│  - Document (8090)       │
│  - Security (8091)       │
└──────────────────────────┘
       ↓
PostgreSQL 16 + Redis 7
```

**Tech Stack:**
- **Frontend:** Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend:** Node.js 20, TypeScript, Express
- **Data:** PostgreSQL 16, Redis 7
- **Gateway:** Kong
- **Infra:** Docker, Docker Compose

---

## Development

### Setup
```powershell
# Backend
docker-compose up -d

# Frontend
cd frontend
npm install
npm run dev
```

### Environment
Copy `.env.example` to `.env`:
```env
POSTGRES_USER=madrasti
POSTGRES_PASSWORD=madrasti
JWT_SECRET=your-secret-key
```

Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ATTENDANCE_URL=http://localhost:8000/attendance
```

---

## Testing

```bash
# Backend
npm test

# Frontend
cd frontend
npm test

# Coverage
npm run test:coverage
```

---

## Platform Verification

### Quick Health Check (30s)
```powershell
.\MADRASTI-HEALTH-CHECK.ps1
```

Checks:
- ✅ 6 Databases
- ✅ Service health
- ✅ Kong routes
- ✅ Environment vars

### Full Verification

See [VERIFICATION-README.md](./VERIFICATION-README.md)

```powershell
.\STEP1-VERIFY-STRICT.ps1  # Docker setup
.\STEP2-VERIFY-STRICT.ps1  # Container health
.\STEP3-VERIFY-STRICT.ps1  # Security flows
.\STEP4-VERIFY-STRICT.ps1  # Feature verification
```

---

## Deployment

### Production
```bash
cp .env.example .env.production
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Scaling
```bash
docker-compose up -d --scale student=3 --scale auth=2
```

### Monitoring
```bash
# Logs
docker logs -f madrasti-<service>-1

# Health
curl http://localhost:8000/health

# Metrics
curl http://localhost:8081/metrics
```

---

## Roadmap

### ✅ MVP Complete (Jan 2026)
- Microservices architecture
- Multi-tenant
- Attendance + GPA
- Documents + Notifications
- Scheduling + Reporting

### 🎯 Next (Q1-Q2 2026)
- Parent mobile app
- Analytics dashboard
- AI insights
- Payment integration
- Arabic (RTL) support

---

## Support

- **Docs:** [docs/](./docs/)
- **Verification:** [VERIFICATION-README.md](./VERIFICATION-README.md)
- **Email:** support@madeldata.com

---

## Author

**Mohammed Adel** — CEO & Founder @ Madel Data

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mohd2adel/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohd2adel)
[![Email](https://img.shields.io/badge/Email-Contact-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:md.abusarar@gmail.com)

*Data Engineering & AI Consultancy | Building scalable EdTech solutions for MENA*


