@echo off
title SmartFuel - Backend API (FastAPI)
echo ========================================================
echo   Starting SmartFuel Backend Server (FastAPI + SQLite)
echo ========================================================
echo.
python -m pip install -r requirements.txt --quiet
python seed.py
echo.
echo Backend running on http://127.0.0.1:8000
python main.py
pause
