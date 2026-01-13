# Madrasti Scripts Guide

This document explains all PowerShell scripts available in the Madrasti project root.

---

## Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| **SETUP.ps1** | Initial installation | First time setup |
| **QUICK-START-DEMO.ps1** | One-click startup | Before demos/presentations |
| **MADRASTI-HEALTH-CHECK.ps1** | System health check | Daily verification |
| **STEP1-VERIFY-STRICT.ps1** | Docker validation | Architecture verification |
| **STEP2-VERIFY-STRICT.ps1** | Container health | Architecture verification |
| **STEP3-VERIFY-STRICT.ps1** | Security validation | Architecture verification |
| **STEP4-VERIFY-STRICT.ps1** | Feature verification | Architecture verification |

---

## Main Scripts (Use These Daily)

### SETUP.ps1
**Purpose:** Complete first-time installation and setup

**What it does:**
1. ✅ Verifies prerequisites (Docker, Node.js, npm)
2. ✅ Creates environment files (.env, frontend/.env.local)
3. ✅ Installs all dependencies (root + frontend)
4. ✅ Starts Docker Compose services
5. ✅ Runs health check
6. ✅ Provides next steps

**When to use:**
- Fresh installation
- After cloning repository
- When setting up new environment
- After major changes to dependencies

**How to use:**
```powershell
.\SETUP.ps1
```

**Time:** ~5-10 minutes (depending on internet speed)

---

### QUICK-START-DEMO.ps1
**Purpose:** Fast one-click startup for demos and presentations

**What it does:**
1. ✅ Starts all backend services (Docker Compose)
2. ✅ Waits 10 seconds for stabilization
3. ✅ Runs health check
4. ✅ Launches frontend in dev mode (new terminal)
5. ✅ Displays access URLs

**When to use:**
- **Before every demo/presentation**
- After system restart
- When all services are stopped
- Quick daily startup

**How to use:**
```powershell
.\QUICK-START-DEMO.ps1
```

**Time:** ~30 seconds

**Expected result:**
- Backend services running
- Frontend terminal opens automatically
- Health check shows all green ✓

---

### MADRASTI-HEALTH-CHECK.ps1
**Purpose:** Quick system health verification

**What it checks:**
1. ✅ **6 Databases** - All databases accessible
2. ✅ **Core Services** - Auth, Student, Attendance, Notification
3. ✅ **Kong Routes** - API Gateway routing
4. ✅ **Frontend Config** - Environment variables present
5. ✅ **Dev Mode** - Ready for development

**When to use:**
- **Before every demo** (30 seconds)
- Daily system verification
- After making changes
- Troubleshooting issues
- Confirming system is operational

**How to use:**
```powershell
.\MADRASTI-HEALTH-CHECK.ps1
```

**Time:** ~5-10 seconds

**Expected output:**
```
=== 1. DATABASES CHECK ===
✓ madrasti
✓ madrasti_attendance
✓ auth_db
✓ student_db
✓ school_db
✓ user_db

=== 2. SERVICES HEALTH ===
✓ auth
✓ student
✓ attendance
✓ notification

=== 3. KONG ROUTES ===
✓ /auth/health
✓ /attendance/health
✓ /notification/health

=== 4. FRONTEND (DEV MODE) ===
⚠ Use 'npm run dev' for demos

=== 5. ENV VARIABLES ===
✓ NEXT_PUBLIC_API_URL
✓ NEXT_PUBLIC_ATTENDANCE_URL
✓ NEXT_PUBLIC_NOTIFICATION_URL

=== RESULT ===
✓✓✓ SYSTEM 100% OPERATIONAL ✓✓✓
```

---

## Verification Scripts (Architecture Validation)

These scripts perform comprehensive platform verification. Use them for quality assurance and before major deployments.

### STEP1-VERIFY-STRICT.ps1
**Purpose:** Docker infrastructure validation

**What it verifies:**
- ✅ Docker installation and version
- ✅ Docker Compose installation
- ✅ docker-compose.yml syntax
- ✅ All Dockerfiles present (11 services)
- ✅ All package.json files present
- ✅ Port mappings configuration
- ✅ Environment variables

**When to use:**
- After fresh installation
- After modifying docker-compose.yml
- Before production deployment
- Troubleshooting container issues

**How to use:**
```powershell
.\STEP1-VERIFY-STRICT.ps1
```

**Time:** ~1 minute

---

### STEP2-VERIFY-STRICT.ps1
**Purpose:** Container health and connectivity validation

**What it verifies:**
- ✅ All 14 containers running
- ✅ Container health status
- ✅ PostgreSQL connectivity (v16)
- ✅ Redis connectivity (v7)
- ✅ Internal network DNS
- ✅ Port accessibility from host
- ✅ No error logs in containers

**When to use:**
- After starting services
- Troubleshooting network issues
- Verifying infrastructure health
- Before running integration tests

**How to use:**
```powershell
.\STEP2-VERIFY-STRICT.ps1
```

**Time:** ~2 minutes

---

### STEP3-VERIFY-STRICT.ps1
**Purpose:** Security and authentication validation

**What it verifies:**
- ✅ Auth service health
- ✅ Login flow (POST /api/v1/auth/login)
- ✅ Token refresh flow
- ✅ Logout flow
- ✅ JWT validation
- ✅ Security service (rate limiting)
- ✅ RBAC permissions
- ✅ Audit logs

**When to use:**
- After auth service changes
- Security audits
- Before production deployment
- Troubleshooting login issues

**How to use:**
```powershell
.\STEP3-VERIFY-STRICT.ps1
```

**Time:** ~2 minutes

---

### STEP4-VERIFY-STRICT.ps1
**Purpose:** Complete feature verification

**What it verifies:**
- ✅ All 11 microservices health
- ✅ Kong API Gateway routing
- ✅ Academic GPA calculation
- ✅ Attendance marking system
- ✅ Scheduling conflict detection
- ✅ Document upload/download
- ✅ WebSocket notifications
- ✅ Report generation (PDF)
- ✅ All CRUD operations

**When to use:**
- After feature implementation
- Before production deployment
- Full system validation
- QA testing cycles

**How to use:**
```powershell
.\STEP4-VERIFY-STRICT.ps1
```

**Time:** ~5 minutes

---

## Usage Workflows

### Daily Development Workflow

```powershell
# Morning startup
.\QUICK-START-DEMO.ps1

# Verify everything works
.\MADRASTI-HEALTH-CHECK.ps1

# Develop...

# Before committing changes
.\MADRASTI-HEALTH-CHECK.ps1
```

---

### Demo/Presentation Workflow

```powershell
# 1. Day before demo
.\MADRASTI-HEALTH-CHECK.ps1
# Fix any issues

# 2. Morning of demo
.\QUICK-START-DEMO.ps1
.\MADRASTI-HEALTH-CHECK.ps1
# Test key features manually

# 3. Just before demo (backup)
.\MADRASTI-HEALTH-CHECK.ps1
# Quick 30-second verification
```

---

### Installation Workflow

```powershell
# Fresh installation
.\SETUP.ps1

# Verify installation
.\MADRASTI-HEALTH-CHECK.ps1

# Optional: Run full verification
.\STEP1-VERIFY-STRICT.ps1
.\STEP2-VERIFY-STRICT.ps1
.\STEP3-VERIFY-STRICT.ps1
.\STEP4-VERIFY-STRICT.ps1
```

---

### Pre-Production Deployment

```powershell
# Full validation suite
.\STEP1-VERIFY-STRICT.ps1
.\STEP2-VERIFY-STRICT.ps1
.\STEP3-VERIFY-STRICT.ps1
.\STEP4-VERIFY-STRICT.ps1

# Final health check
.\MADRASTI-HEALTH-CHECK.ps1
```

---

## Troubleshooting

### Script Fails to Run

**Issue:** Script execution policy error

**Solution:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

### Docker Not Found

**Issue:** Script reports Docker missing

**Solution:**
1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Ensure Docker Desktop is running
3. Verify: `docker --version`

---

### Services Not Starting

**Issue:** Health check shows services down

**Solution:**
```powershell
# Check logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>

# Restart all services
docker-compose down
docker-compose up -d
```

---

### Port Already in Use

**Issue:** Container fails to start (port conflict)

**Solution:**
```powershell
# Check what's using the port
netstat -ano | findstr :8000

# Kill the process (replace PID)
taskkill /PID <process_id> /F

# Or change port in docker-compose.yml
```

---

## Script Maintenance

### When to Update Scripts

- After adding new services
- After changing port mappings
- After modifying environment variables
- After infrastructure changes

### How to Customize

All scripts are designed to be easily customizable:

1. **Change base directory:**
   - Edit `$scriptDir` variable at top of each script

2. **Add new health checks:**
   - Add to `$services` array in MADRASTI-HEALTH-CHECK.ps1

3. **Modify verification steps:**
   - Edit respective STEP*.ps1 files

---

## Best Practices

### Daily Use
- ✅ Run `QUICK-START-DEMO.ps1` once per day
- ✅ Run `MADRASTI-HEALTH-CHECK.ps1` before commits
- ✅ Keep Docker Desktop running

### Before Demos
- ✅ Run health check 1 day before
- ✅ Run health check 1 hour before
- ✅ Run health check 5 minutes before
- ✅ Have backup plan (QUICK-START-DEMO.ps1 ready)

### Before Deployment
- ✅ Run full verification suite (STEP1-4)
- ✅ Review logs for warnings
- ✅ Test critical features manually
- ✅ Document any known issues

---

## Additional Resources

- **Full Documentation:** [README.md](./README.md)
- **Verification Details:** [VERIFICATION-README.md](./VERIFICATION-README.md)
- **Demo Checklist:** [README.md#demo--presentation-checklist](./README.md#demo--presentation-checklist)

---

**Last Updated:** January 2026  
**Platform Version:** 1.0.0 (MVP Complete)
