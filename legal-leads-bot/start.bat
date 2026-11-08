@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Legal Leads Bot
if not exist ".venv\Scripts\python.exe" (
  echo Evvelce setup.bat faylini isledin.
  pause
  exit /b 1
)
echo Bot isleyir. Dayandirmaq ucun Ctrl+C basin ve ya bu pencereni baglayin.
".venv\Scripts\python.exe" -m leadsbot serve
pause
