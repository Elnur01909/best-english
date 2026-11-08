@echo off
if /i not "%~1"=="--inner" (
  cmd /k call "%~f0" --inner
  exit /b
)
cd /d "%~dp0"
title Legal Leads Bot - qurasdirma

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo Python tapilmadi.
  echo https://www.python.org/downloads saytindan qurasdirin ve "Add Python to PATH" qutusunu isareleyin.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Virtual muhit yaradilir...
  %PY% -m venv .venv
  if errorlevel 1 (
    echo Virtual muhit yaradilmadi.
    pause
    exit /b 1
  )
)

echo Asililiqlar qurasdirilir, 1-2 deqiqe cekir...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt
if errorlevel 1 (
  echo Asililiqlar qurasdirilmadi. Internet baglantisini yoxlayin.
  pause
  exit /b 1
)

".venv\Scripts\python.exe" -m leadsbot setup
echo.
pause
