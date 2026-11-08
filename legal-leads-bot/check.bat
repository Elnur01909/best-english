@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Legal Leads Bot - menbe testi
if not exist ".venv\Scripts\python.exe" (
  echo Evvelce setup.bat faylini isledin.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m leadsbot check
pause
