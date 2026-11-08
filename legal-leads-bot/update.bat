@echo off
if /i not "%~1"=="--inner" (
  cmd /k call "%~f0" --inner
  exit /b
)
cd /d "%~dp0"
title Legal Leads Bot - yenileme
rem Butun emrler bir blokdadir: yenileme bu faylin ozunu deyisse de cmd qarismir.
(
  if not exist ".venv\Scripts\python.exe" (
    echo Evvelce setup.bat faylini isledin.
    exit /b 1
  )
  ".venv\Scripts\python.exe" -m leadsbot update
  exit /b
)
