@echo off
title SmartFuel Platform - SE331 Capstone Project
echo ========================================================
echo   Starting SmartFuel Web Application (FastAPI + SQLite)
echo   Department of SWE - Daffodil International University
echo ========================================================
echo.

echo [1/3] Checking Python dependencies...
python -m pip install -r requirements.txt --quiet

echo [2/3] Checking and initializing database...
python seed.py

echo [3/3] Launching web server on http://127.0.0.1:8000 ...
echo.
echo ========================================================
echo   Open your browser and navigate to:
echo   http://127.0.0.1:8000
echo ========================================================
echo.

python main.py
pause
