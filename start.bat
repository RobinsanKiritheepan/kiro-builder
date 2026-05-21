@echo off
title Kiro Builder
echo.
echo  ============================================
echo    KIRO BUILDER — AI Web App Generator
echo  ============================================
echo.

REM ── Backend setup ────────────────────────────────────────────
echo  [1/3] Preparation du backend Python...
cd /d "%~dp0backend"

REM Creer .env depuis .env.example au premier lancement
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo  [+] backend\.env cree depuis .env.example
        echo      Ajoute tes cles API dans backend\.env !
        echo.
    )
)

REM Creer le dossier projects s'il n'existe pas
if not exist "projects" (
    mkdir projects
    echo  [+] Dossier backend\projects\ cree
)

REM Creer le virtualenv si absent
if not exist "venv" (
    echo  [~] Creation du virtualenv Python...
    python -m venv venv
    if errorlevel 1 (
        echo  [!] Echec. Verifie que Python 3.10+ est installe.
        pause & exit /b 1
    )
)

REM Activer + installer les dependances
call venv\Scripts\activate.bat
echo  [~] Installation des dependances backend...
pip install -q -r requirements.txt
if errorlevel 1 ( echo  [!] pip install echoue. & pause & exit /b 1 )
echo  [+] Backend pret.
echo.

REM Demarrer le backend dans une fenetre persistante
REM PYTHONUTF8=1 requis pour eviter les crashes Unicode (fleches dans router.py)
start "Kiro Backend :8000" cmd /k "cd /d %~dp0backend && set PYTHONUTF8=1&& call venv\Scripts\activate.bat && python -m uvicorn brain:app --host 127.0.0.1 --port 8000 --reload"

REM ── Frontend setup ───────────────────────────────────────────
echo  [2/3] Preparation du frontend Vite...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo  [~] Installation des packages npm...
    call npm install
)

echo  [+] Frontend pret.
echo.

REM Demarrer le frontend dans une fenetre persistante
start "Kiro Frontend :3000" cmd /k "cd /d %~dp0frontend && npm run dev"

REM ── Ouvrir le navigateur ──────────────────────────────────────
echo  [3/3] Ouverture du navigateur dans 4 secondes...
timeout /t 4 /nobreak >nul
start http://127.0.0.1:3000

echo.
echo  ============================================
echo    Kiro Builder est lance !
echo    Frontend  : http://127.0.0.1:3000
echo    Backend   : http://127.0.0.1:8000
echo    API docs  : http://127.0.0.1:8000/docs
echo    Projets   : backend\projects\
echo  ============================================
echo.
echo  Ferme les fenetres "Kiro Backend" et "Kiro Frontend"
echo  pour arreter les serveurs, ou utilise kill.bat.
echo.
pause
