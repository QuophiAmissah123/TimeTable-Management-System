@echo off
title Run Conflict Engine & Domain Tests
color 0A

echo =====================================================================
echo       RUNNING AUTOMATED UNIT & CONFLICT ENGINE TESTS
echo =====================================================================
echo.

cd /d "%~dp0"

call npm.cmd test
echo.
pause
