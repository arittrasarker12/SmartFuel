@echo off
title SmartFuel - Full Stack Runner
echo ========================================================
echo   Launching SmartFuel Full Stack (Backend + Frontend)
echo ========================================================
echo.

echo [1/2] Starting Backend Server (port 8000)...
start "SmartFuel Backend" cmd /k "run_backend.bat"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend Server (port 5173)...
start "SmartFuel Frontend (React)" cmd /k "run_frontend.bat"

echo.
echo ========================================================
echo   Backend URL : http://127.0.0.1:8000
echo   Frontend URL: http://127.0.0.1:5173
echo ========================================================
echo.
