@echo off
rem Botu Windows acilanda avtomatik (kicik pencerede) ise salir.
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\LegalLeadsBot.bat"
if not exist "%~dp0.venv\Scripts\python.exe" (
  echo Evvelce setup.bat faylini isledin.
  pause
  exit /b 1
)
> "%TARGET%" echo @echo off
>> "%TARGET%" echo start "Legal Leads Bot" /min "%~dp0start.bat"
if errorlevel 1 (
  echo Avtomatik acilis qurasdirilmadi.
  pause
  exit /b 1
)
echo Hazirdir. Kompyuter her acilanda bot ozu ise dusecek ve kicik pencerede isleyecek.
echo Legv etmek ucun: autostart-remove.bat
echo Bot artiq isleyirse, ikinci nusxe acilmayacaq.
pause
