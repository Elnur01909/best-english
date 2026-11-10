@echo off
schtasks /delete /tn "LegalLeadsBotWatchdog" /f >nul 2>nul
echo Bot dayananda artiq ozu yeniden baslamayacaq. Dayandirmaq ucun indi bot penceresini baglayin.
set "TARGET=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LegalLeadsBot.bat"
if exist "%TARGET%" (
  del "%TARGET%"
  echo Avtomatik acilis legv edildi.
) else (
  echo Avtomatik acilis qurasdirilmayib.
)
pause
