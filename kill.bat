@echo off
title Kiro — Kill
echo.
echo  [KILL] Arret de tous les processus Kiro...
echo.

taskkill /F /IM node.exe       >nul 2>&1 && echo  [OK] Node.js arrete      || echo  [--] Node.js   : aucun process
taskkill /F /IM python.exe     >nul 2>&1 && echo  [OK] Python arrete       || echo  [--] Python    : aucun process
taskkill /F /IM uvicorn.exe    >nul 2>&1 && echo  [OK] Uvicorn arrete      || echo  [--] Uvicorn   : aucun process

echo.
echo  [OK] Propre. Lance dev.bat pour redemarrer.
echo.
timeout /t 2 /nobreak >nul
