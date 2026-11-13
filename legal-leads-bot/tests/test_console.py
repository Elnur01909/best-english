"""Pəncərəyə klik bot donmasın: Windows QuickEdit rejimi söndürülür."""
from leadsbot import __main__ as entry


def test_does_nothing_outside_windows(monkeypatch):
    monkeypatch.setattr(entry.sys, "platform", "linux")
    assert entry.disable_quick_edit() is False


def test_never_raises_without_a_console():
    # pytest çıxışı konsol deyil: funksiya sakitcə False qaytarmalı, xəta atmamalıdır
    assert entry.disable_quick_edit() in (True, False)


def test_clears_only_the_quick_edit_bit(monkeypatch):
    import ctypes

    calls = {}

    class FakeKernel:
        def GetStdHandle(self, n):
            return 7

        def GetConsoleMode(self, handle, ref):
            ref._obj.value = 0x01F7  # QuickEdit (0x40) və digər bitlər açıq
            return 1

        def SetConsoleMode(self, handle, mode):
            calls["mode"] = mode
            return 1

    monkeypatch.setattr(entry.sys, "platform", "win32")
    monkeypatch.setattr(ctypes, "windll", type("W", (), {"kernel32": FakeKernel()})(), raising=False)
    assert entry.disable_quick_edit() is True
    assert calls["mode"] & 0x0040 == 0 and calls["mode"] & 0x0080 and calls["mode"] & 0x0137 == 0x0137
