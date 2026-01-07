# Madrasti Platform Verification Scripts

## Overview

This directory contains **4 progressive verification scripts** that validate different layers of the Madrasti platform, from basic Docker setup to full feature integration.

## Verification Hierarchy

```
STEP1-VERIFY-STRICT.ps1  →  STEP2-VERIFY-STRICT.ps1  →  STEP3-VERIFY-STRICT.ps1  →  STEP4-VERIFY-STRICT.ps1
     (Docker)                  (Infrastructure)              (Services)                  (Features)
```

Each script **must pass** before moving to the next level.

---

## 📋 Script Details

### 🔵 STEP1-VERIFY-STRICT.ps1
**Purpose**: Validates Docker installation and project configuration

**Checks**:
- ✅ Docker and Docker Compose installed
- ✅ docker-compose.yml syntax valid
- ✅ Required services defined
- ✅ Volume and network configuration
- ✅ Health check definitions
- ✅ Port mappings configured
- ✅ Environment variables present
- ✅ Dockerfiles exist
- ✅ Package.json files present

**When to run**: Before `docker compose up`

**Usage**:
```powershell
cd C:\Users\Utilisateur\Desktop\Madrasti
.\STEP1-VERIFY-STRICT.ps1
```

**Expected output**: `STEP 1 VERIFICATION (STRICT): PASS ✅`

---

### 🟢 STEP2-VERIFY-STRICT.ps1
**Purpose**: Validates running containers and infrastructure connectivity

**Checks**:
- ✅ All containers present and running
- ✅ All containers healthy (health checks passing)
- ✅ Ports accessible on localhost
- ✅ PostgreSQL connection working
- ✅ Redis connection working (PING → PONG)
- ✅ Container logs clean (no errors)
- ✅ Internal DNS resolution working
- ✅ Data volumes mounted
- ✅ Resource usage stats

**When to run**: After `docker compose up -d`

**Usage**:
```powershell
cd C:\Users\Utilisateur\Desktop\Madrasti
docker compose up -d
Start-Sleep -Seconds 20
.\STEP2-VERIFY-STRICT.ps1
```

**Expected output**: `STEP 2 VERIFY (STRICT): PASS ✅`

---

### 🟡 STEP3-VERIFY-STRICT.ps1
**Purpose**: Validates service health endpoints and observability

**Checks**:
- ✅ `/health` endpoints return 200 OK
- ✅ `/readyz` endpoints return 200 OK  
- ✅ `/metrics` endpoints return Prometheus metrics
- ✅ Metrics contain service-specific prefixes
- ✅ Metrics contain custom HTTP metrics
- ✅ Kong routing working (gateway health checks)
- ✅ Kong admin API accessible
- ✅ In-network HTTP connectivity
- ✅ Redis PING from services
- ✅ PostgreSQL SELECT 1 from services

**When to run**: After STEP2 passes

**Usage**:
```powershell
.\STEP3-VERIFY-STRICT.ps1
```

**Expected output**: `STEP 3 VERIFY (STRICT): PASS ✅`

**Note**: Some services may not have `/readyz` (marked as optional/warnings)

---

### 🔴 STEP4-VERIFY-STRICT.ps1
**Purpose**: Validates Step 4 security features and API contracts

**Checks**:
- ✅ Security service operational
- ✅ Security service health/readyz/metrics
- ✅ Auth service Step 4 endpoints in OpenAPI spec:
  - `/api/v1/auth/password/change`
  - `/api/v1/auth/password/reset/request`
  - `/api/v1/auth/password/reset/confirm`
  - `/api/v1/auth/sessions/revoke-all`
  - `/api/v1/auth/security/settings`
- ✅ PostgreSQL security schema exists
- ✅ Security tables created:
  - `security.audit_events`
  - `security.password_policies`
  - `security.password_history`
  - `security.account_lockouts`
  - `security.gdpr_requests`

**When to run**: After STEP3 passes

**Usage**:
```powershell
.\STEP4-VERIFY-STRICT.ps1
```

**Expected output**: `Step 4 strict verification PASSED ✅`

---

## 🎯 Quick Start

Run all verifications in sequence:

```powershell
# 1. Validate configuration (before starting)
.\STEP1-VERIFY-STRICT.ps1

# 2. Start containers
docker compose up -d --build

# 3. Wait for services to initialize
Start-Sleep -Seconds 30

# 4. Validate infrastructure
.\STEP2-VERIFY-STRICT.ps1

# 5. Validate service health
.\STEP3-VERIFY-STRICT.ps1

# 6. Validate security features
.\STEP4-VERIFY-STRICT.ps1
```

---

## 🔧 Troubleshooting

### STEP1 fails
**Issue**: Docker not installed or compose file invalid  
**Fix**: Install Docker Desktop, check docker-compose.yml syntax

### STEP2 fails  
**Issue**: Containers not starting or unhealthy  
**Fix**:
```powershell
docker compose logs <service-name>
docker compose ps
docker inspect madrasti-<service>-1
```

### STEP3 fails
**Issue**: Health endpoints not responding  
**Fix**:
- Check service logs: `docker logs madrasti-<service>-1`
- Verify database connections
- Check `/readyz` endpoint implementation

### STEP4 fails
**Issue**: Security endpoints missing or tables not created  
**Fix**:
- Rebuild auth service: `docker compose build auth --no-cache`
- Run migrations: `docker compose exec auth npm run migrate`
- Check OpenAPI spec: `curl http://localhost:8081/openapi.json`

---

## 📊 Verification Matrix

| Script | Docker | Containers | Health | Metrics | OpenAPI | Database |
|--------|--------|------------|--------|---------|---------|----------|
| STEP1  | ✅     | -          | -      | -       | -       | -        |
| STEP2  | ✅     | ✅         | ✅     | -       | -       | ✅       |
| STEP3  | ✅     | ✅         | ✅     | ✅      | -       | ✅       |
| STEP4  | ✅     | ✅         | ✅     | ✅      | ✅      | ✅       |

---

## 🗑️ Deprecated Scripts (Can be deleted)

These scripts are superseded by the STEP1-4 verification scripts:

- ❌ `run_all.ps1` → Use STEP2 + STEP3
- ❌ `smoke.ps1` → Use STEP2 + STEP3
- ❌ `smoke2.ps1` → Use STEP2 + STEP3
- ❌ `step2_full_tests.ps1` → Use STEP2 + unit tests separately
- ❌ `step3-smoke.ps1` → Use STEP3

**Recommendation**: After confirming STEP1-4 work, delete the deprecated scripts to reduce clutter.

---

## 🎓 Best Practices

### During Development
```powershell
# Quick health check
.\STEP3-VERIFY-STRICT.ps1
```

### Before Deployment
```powershell
# Full validation suite
.\STEP1-VERIFY-STRICT.ps1
.\STEP2-VERIFY-STRICT.ps1
.\STEP3-VERIFY-STRICT.ps1
.\STEP4-VERIFY-STRICT.ps1
```

### After Code Changes
```powershell
# Rebuild specific service
docker compose build <service> --no-cache
docker compose up -d <service>

# Wait and verify
Start-Sleep -Seconds 15
.\STEP3-VERIFY-STRICT.ps1
.\STEP4-VERIFY-STRICT.ps1
```

### CI/CD Pipeline
```powershell
# Non-interactive validation
$ErrorActionPreference = "Stop"
.\STEP1-VERIFY-STRICT.ps1
.\STEP2-VERIFY-STRICT.ps1
.\STEP3-VERIFY-STRICT.ps1
.\STEP4-VERIFY-STRICT.ps1
Write-Host "All verifications passed!" -ForegroundColor Green
```

---

## 📝 Maintenance

### Adding New Services
1. Update STEP1: Add service to `$requiredServices`
2. Update STEP2: Add service to `$REQUIRED_CONTAINERS`
3. Update STEP3: Add health/readyz/metrics URLs
4. Update STEP4: Add any feature-specific validations

### Adding New Endpoints
1. Update STEP4: Add endpoint to `$authExpectedPaths` or create new validation section

---

## ✅ Success Criteria

All 4 scripts must output:
```
✅ STEP 1 VERIFICATION (STRICT): PASS ✅
✅ STEP 2 VERIFY (STRICT): PASS ✅
✅ STEP 3 VERIFY (STRICT): PASS ✅
✅ Step 4 strict verification PASSED ✅
```

**Platform Status**: ✅ **FULLY OPERATIONAL**

---

## 📞 Support

If any verification fails:
1. Check the error message (scripts provide detailed diagnostics)
2. Review container logs: `docker logs madrasti-<service>-1`
3. Check docker compose status: `docker compose ps`
4. Refer to troubleshooting section above

---

**Last Updated**: 2026-01-07  
**Platform Version**: Madrasti Step 4 Complete
