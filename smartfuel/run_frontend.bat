@echo off
title SmartFuel - Frontend Client (React + Vite)
echo ========================================================
echo   Starting SmartFuel Frontend (React + Vite)
echo ========================================================
echo.
cd frontend
echo Checking npm dependencies...
call npm install --silent
echo.
echo Launching React frontend on http://127.0.0.1:5173 ...
call npm run dev
pause
