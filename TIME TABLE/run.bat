@echo off
title College Academic Timetable System - Launcher
color 0B

echo =====================================================================
echo           COLLEGE ACADEMIC TIMETABLE SYSTEM
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking environment & database...
if not exist "prisma\dev.db" (
    echo [INFO] First-time setup detected. Initializing database and seed data...
    call npx.cmd prisma generate
    call npx.cmd prisma db push
    call npx.cmd tsx prisma/seed.ts
) else (
    echo [INFO] Database already initialized.
)

echo.
echo [2/3] Launching web browser at http://localhost:3000 in 3 seconds...
start "" "http://localhost:3000"

echo.
echo [3/3] Starting Next.js Development Server...
echo.
echo =====================================================================
echo  * Public Schedule:     http://localhost:3000/timetables
echo  * Administrator Portal: http://localhost:3000/login
echo.
echo  Default Credentials:
echo    - Admin:  admin@university.edu  /  Admin123!
echo    - Viewer: viewer@university.edu /  Viewer123!
echo =====================================================================
echo.
echo Press Ctrl+C in this window anytime to stop the server.
echo.

call npm.cmd run dev
pause
