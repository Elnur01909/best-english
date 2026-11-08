@echo off
if /i not "%~1"=="--inner" (
  cmd /k call "%~f0" --inner
  exit /b
)
cd /d "%~dp0"
title Legal Leads Bot - menbe testi
if not exist ".venv\Scripts\python.exe" (
  echo Evvelce setup.bat faylini isledin.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m leadsbot check
pause
