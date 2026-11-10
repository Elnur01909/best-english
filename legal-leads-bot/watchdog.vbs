' Bot dayanibsa yeniden baslat. Windows tapsirigi (LegalLeadsBotWatchdog) 10 deqiqeden bir isledir.
' Legv etmek ucun: autostart-remove.bat
Option Explicit
Dim wmi, shell, fso, folder, proc

Set wmi = GetObject("winmgmts:\\.\root\cimv2")

Function BotIsRunning()
    BotIsRunning = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name='python.exe' AND CommandLine LIKE '%leadsbot serve%'").Count > 0
End Function

If BotIsRunning() Then WScript.Quit 0
' Yenilenende bot bir neche saniye yoxdur: ikinci nusxe acilmasin deye gozleyib yeniden yoxlayir.
WScript.Sleep 20000
If BotIsRunning() Then WScript.Quit 0

Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)

' Evvelki dayanmis pencere qalibsa baglanir, yoxsa pencereler yigilar.
For Each proc In wmi.ExecQuery("SELECT * FROM Win32_Process WHERE Name='cmd.exe' AND CommandLine LIKE '%legal-leads-bot%start.bat%'")
    proc.Terminate
Next

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = folder
shell.Run "cmd /c start ""Legal Leads Bot"" /min """ & folder & "\start.bat""", 0, False
