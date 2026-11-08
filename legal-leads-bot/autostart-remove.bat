@echo off
set "TARGET=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LegalLeadsBot.bat"
if exist "%TARGET%" (
  del "%TARGET%"
  echo Avtomatik acilis legv edildi.
) else (
  echo Avtomatik acilis qurasdirilmayib.
)
pause
