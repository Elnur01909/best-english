"""Bot dayananda onu yeniden baslatan Windows tapsirigi."""
from leadsbot.config import ROOT

TASK = "LegalLeadsBotWatchdog"


def read(name):
    return (ROOT / name).read_bytes()


def test_windows_scripts_are_plain_ascii():
    for name in ("watchdog.vbs", "watchdog-install.ps1", "autostart.bat", "autostart-remove.bat"):
        read(name).decode("ascii")


def test_watchdog_looks_for_the_serving_bot_and_starts_it_minimised():
    text = read("watchdog.vbs").decode("ascii")
    assert "leadsbot serve" in text and "start.bat" in text and "/min" in text


def test_watchdog_waits_before_restarting_so_an_update_is_not_doubled():
    text = read("watchdog.vbs").decode("ascii")
    assert text.count("BotIsRunning() Then WScript.Quit") == 2 and "WScript.Sleep" in text


def test_task_is_installed_by_autostart_and_removed_by_autostart_remove():
    assert TASK in read("watchdog-install.ps1").decode("ascii")
    assert b"watchdog-install.ps1" in read("autostart.bat")
    assert TASK.encode() in read("autostart-remove.bat") and b"/delete" in read("autostart-remove.bat")


def test_task_runs_on_battery_power():
    assert "AllowStartIfOnBatteries" in read("watchdog-install.ps1").decode("ascii")
