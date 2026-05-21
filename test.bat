@echo off
chcp 65001 >nul 2>&1
title Kiro Builder - Backend Only
echo.
echo  ============================================
echo    KIRO BUILDER - Backend seul (test/debug)
echo  ============================================
echo.

REM -- Kill stale python processes
taskkill /F /IM python.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM -- Start backend
echo  Demarrage du backend sur http://127.0.0.1:8000 ...
echo  API docs : http://127.0.0.1:8000/docs
echo.
cd /d "%~dp0backend" && set PYTHONUTF8=1 && call venv\Scripts\activate.bat && python -m uvicorn brain:app --host 127.0.0.1 --port 8000 --reload
