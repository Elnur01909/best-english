"""Eyni kompüterdə botun iki nüsxəsinin eyni vaxtda işləməsinin qarşısını alır
(məs. avtomatik açılış + əl ilə start.bat). İki nüsxə Telegram-da 409 Conflict xətası verir."""
from __future__ import annotations

import os
from pathlib import Path


class SingleInstance:
    def __init__(self, path: Path):
        self.path = Path(path)
        self._fh = None

    def acquire(self) -> bool:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fh = open(self.path, "a+")
        try:
            if os.name == "nt":
                import msvcrt
                fh.seek(0)
                msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            fh.close()
            return False
        fh.seek(0)
        fh.truncate()
        fh.write(str(os.getpid()))
        fh.flush()
        self._fh = fh
        return True

    def release(self) -> None:
        if self._fh is not None:
            try:
                self._fh.close()
            finally:
                self._fh = None
