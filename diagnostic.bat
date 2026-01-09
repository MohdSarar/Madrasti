@echo off
echo ====================================
echo DIAGNOSTIC STEP 4 PATCH
echo ====================================
echo.

echo [1] Checking TypeScript compilation errors...
echo.
echo --- Scheduling Service ---
cd services\scheduling 2>nul
if exist src\controllers\ScheduleController.ts (
    echo File exists: ScheduleController.ts
    findstr /n "req.params" src\controllers\ScheduleController.ts | findstr /n "entityType\|entityId\|timetableId"
) else (
    echo ERROR: ScheduleController.ts not found
)
if exist src\services\WeeklyViewGenerator.ts (
    echo File exists: WeeklyViewGenerator.ts
    findstr /n "dayMap\[" src\services\WeeklyViewGenerator.ts
) else (
    echo ERROR: WeeklyViewGenerator.ts not found
)
cd ..\..

echo.
echo --- Attendance Service ---
cd services\attendance 2>nul
if exist src\controllers\AttendanceController.ts (
    echo File exists: AttendanceController.ts
    findstr /n "req.params" src\controllers\AttendanceController.ts | findstr /n "studentId\|periodId"
) else (
    echo ERROR: AttendanceController.ts not found
)
cd ..\..

echo.
echo [2] Checking Reporting dependencies...
echo.
cd services\reporting 2>nul
if exist package.json (
    echo Checking package.json for pdfkit and axios:
    findstr /i "pdfkit" package.json
    findstr /i "axios" package.json
    echo.
    echo Checking if @types/pdfkit exists:
    findstr /i "@types/pdfkit" package.json
) else (
    echo ERROR: package.json not found
)
cd ..\..

echo.
echo [3] Checking Document PermissionService...
echo.
cd services\document 2>nul
if exist src\services\PermissionService.ts (
    echo Checking PermissionService.ts content:
    findstr /n "checkAccess\|grantPermission\|revokePermission" src\services\PermissionService.ts
) else (
    echo ERROR: PermissionService.ts not found
)
cd ..\..

echo.
echo [4] Checking Docker build errors in detail...
echo.
echo Running: docker compose build scheduling 2^>^&1 ^| findstr /i "error"
docker compose build scheduling 2>&1 | findstr /i "error"

echo.
echo Running: docker compose build attendance 2^>^&1 ^| findstr /i "error"
docker compose build attendance 2>&1 | findstr /i "error"

echo.
echo [5] Checking exact TypeScript error locations...
echo.
cd services\scheduling\src\controllers 2>nul
if exist ScheduleController.ts (
    echo --- Line 15 of ScheduleController.ts ---
    powershell -Command "Get-Content ScheduleController.ts | Select-Object -Skip 14 -First 1"
    echo --- Context (lines 10-20) ---
    powershell -Command "Get-Content ScheduleController.ts | Select-Object -Skip 9 -First 11"
)
cd ..\..\..\..

cd services\attendance\src\controllers 2>nul
if exist AttendanceController.ts (
    echo --- Line 44 of AttendanceController.ts ---
    powershell -Command "Get-Content AttendanceController.ts | Select-Object -Skip 43 -First 1"
    echo --- Context (lines 40-50) ---
    powershell -Command "Get-Content AttendanceController.ts | Select-Object -Skip 39 -First 11"
)
cd ..\..\..\..

cd services\scheduling\src\services 2>nul
if exist WeeklyViewGenerator.ts (
    echo --- Line 72 of WeeklyViewGenerator.ts ---
    powershell -Command "Get-Content WeeklyViewGenerator.ts | Select-Object -Skip 71 -First 1"
    echo --- Context (lines 68-76) ---
    powershell -Command "Get-Content WeeklyViewGenerator.ts | Select-Object -Skip 67 -First 9"
)
cd ..\..\..\..

echo.
echo ====================================
echo DIAGNOSTIC COMPLETE
echo ====================================
