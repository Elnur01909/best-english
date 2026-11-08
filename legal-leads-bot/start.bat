@echo off
if /i not "%~1"=="--inner" (
  cmd /k call "%~f0" --inner
  exit /b
)
cd /d "%~dp0"
title Legal Leads Bot
if not exist ".venv\Scripts\python.exe" (
  echo Evvelce setup.bat faylini isledin.
  pause
  exit /b 1
)
echo Bot isleyir. Dayandirmaq ucun Ctrl+C basin ve ya bu pencereni baglayin.
".venv\Scripts\python.exe" -m leadsbot serve
echo.
echo Bot dayandi. Sebebi yuxarida ve data\leadsbot.log faylindadir.
