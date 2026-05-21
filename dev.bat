@echo off
chcp 65001 >nul 2>&1
title Kiro Builder - Dev
echo.
echo  ============================================
echo    KIRO BUILDER - Lancement rapide dev
echo  ============================================
echo.

REM -- Creer les dossiers necessaires ---------------------------------
if not exist "%~dp0backend\projects" mkdir "%~dp0backend\projects"

REM -- Kill stale processes -------------------------------------------
echo  [0/3] Nettoyage des anciens processus...
taskkill /F /IM node.exe    >nul 2>&1
taskkill /F /IM python.exe  >nul 2>&1
timeout /t 1 /nobreak >nul
echo  [OK] Propre.
echo.

REM -- Verifier le venv -----------------------------------------------
if not exist "%~dp0backend\venv\Scripts\activate.bat" (
    echo  [!] venv introuvable. Creation en cours...
    cd /d "%~dp0backend"
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd /d "%~dp0"
    echo  [OK] venv cree et dependances installees.
    echo.
)

REM -- Backend --------------------------------------------------------
echo  [1/3] Demarrage du backend (port 8000)...
start "Kiro Backend :8000" cmd /k "cd /d %~dp0backend && set PYTHONUTF8=1&& call venv\Scripts\activate.bat && python -m uvicorn brain:app --host 127.0.0.1 --port 8000 --reload"

REM Attendre que le backend demarre
echo  Attente du backend...
timeout /t 3 /nobreak >nul

REM -- Verifier que le backend repond ---------------------------------
echo  [2/3] Verification du backend...
curl -s http://127.0.0.1:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Backend en ligne.
) else (
    echo  [!] Backend pas encore pret, on continue quand meme...
)
echo.

REM -- Frontend -------------------------------------------------------
echo  [3/3] Demarrage du frontend (port 3000)...
start "Kiro Frontend :3000" cmd /k "cd /d %~dp0frontend && npm run dev"

REM -- Ouvrir le browser ----------------------------------------------
echo.
echo  Ouverture du navigateur dans 3 secondes...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:3000

echo.
echo  ============================================
echo    Frontend  : http://127.0.0.1:3000
echo    Backend   : http://127.0.0.1:8000
echo    API docs  : http://127.0.0.1:8000/docs
echo    Projets   : backend\projects\
echo  ============================================
echo.
echo  Moteur IA  : Claude Sonnet 4.6
echo  Design     : 119 palettes / 84 styles / 73 fonts
echo  Timeout    : 300s / Max tokens 16K
echo.
echo  Utilise kill.bat pour tout arreter.
echo.
