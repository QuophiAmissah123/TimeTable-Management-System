@echo off
title Reset & Reseed Database - Timetable System
color 0E

echo =====================================================================
echo       RESET & RESEED DATABASE (College Timetable System)
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Syncing schema with Prisma...
call npx.cmd prisma db push

echo.
echo [2/3] Seeding database with fresh initial records...
call npx.cmd tsx prisma/seed.ts

echo.
echo =====================================================================
echo [SUCCESS] Database successfully reseeded!
echo Default Accounts:
echo   - Admin:  admin@university.edu  /  Admin123!
echo   - Viewer: viewer@university.edu /  Viewer123!
echo =====================================================================
echo.
pause
