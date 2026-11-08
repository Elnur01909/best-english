import io
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from leadsbot import updater
from leadsbot.updater import RestartRequested, UpdateError, apply_zip, run_update

TOP = "best-english-claude-legal-aid-azerbaijan-research-3roqlx"


def make_zip(files: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(f"{TOP}/", b"")
        for name, data in files.items():
            zf.writestr(f"{TOP}/{name}", data)
    return buf.getvalue()


def test_apply_zip_writes_only_bot_files_and_protects_user_data(tmp_path):
    (tmp_path / ".env").write_text("TELEGRAM_BOT_TOKEN=secret")
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "leads.sqlite").write_bytes(b"db")
    (tmp_path / "keep.txt").write_text("same")
    data = make_zip({
        "legal-leads-bot/leadsbot/new.py": b"print('new')",
        "legal-leads-bot/keep.txt": b"same",
        "legal-leads-bot/.env": b"TELEGRAM_BOT_TOKEN=evil",
        "legal-leads-bot/data/leads.sqlite": b"evil",
        "legal-leads-bot/.venv/x": b"evil",
        "legal-leads-bot/../escape.txt": b"evil",
        "src/app/page.tsx": b"site file",
        "CLAUDE.md": b"root file",
    })
    count, changed = apply_zip(data, tmp_path)
    assert changed == ["leadsbot/new.py"] and count == 1
    assert (tmp_path / "leadsbot" / "new.py").read_text() == "print('new')"
    assert (tmp_path / ".env").read_text() == "TELEGRAM_BOT_TOKEN=secret"
    assert (tmp_path / "data" / "leads.sqlite").read_bytes() == b"db"
    assert not (tmp_path / ".venv").exists() and not (tmp_path.parent / "escape.txt").exists()
    assert not (tmp_path / "src").exists() and not (tmp_path / "CLAUDE.md").exists()
    assert not list(tmp_path.rglob("*.update-tmp"))


def test_apply_zip_rejects_wrong_archive(tmp_path):
    with pytest.raises(UpdateError):
        apply_zip(b"not a zip", tmp_path)
    with pytest.raises(UpdateError):
        apply_zip(make_zip({"other/file.txt": b"x"}), tmp_path)


class FakeResp:
    def __init__(self, status=200, json_data=None, content=b""):
        self.status_code, self._json, self.content = status, json_data, content

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests
            raise requests.HTTPError(response=self)

    def json(self):
        return self._json


class FakeSession:
    def __init__(self, sha, zip_bytes):
        self.sha, self.zip_bytes, self.headers, self.urls = sha, zip_bytes, {}, []

    def get(self, url, **kw):
        self.urls.append(url)
        if "api.github.com" in url:
            return FakeResp(json_data={"sha": self.sha})
        return FakeResp(content=self.zip_bytes)


def test_run_update_flow_and_version_file(tmp_path):
    z = make_zip({"legal-leads-bot/requirements.txt": b"requests\n", "legal-leads-bot/a.py": b"1"})
    pips = []
    res = run_update(tmp_path, session=FakeSession("abc1234def", z), pip=pips.append)
    assert res.updated and res.files == 2 and res.pip_ran and pips == [tmp_path]
    assert (tmp_path / "data" / "version.txt").read_text() == "abc1234def"
    assert "abc1234" in res.message
    sess = FakeSession("abc1234def", z)
    res = run_update(tmp_path, session=sess, pip=pips.append)
    assert not res.updated and "son versiya" in res.message
    assert all("codeload" not in u for u in sess.urls)  # eyni versiya → endirmə yoxdur
    assert sess.urls[0].endswith("/repos/Elnur01909/best-english/commits/claude/legal-aid-azerbaijan-research-3roqlx")


def test_run_update_without_requirement_change_skips_pip(tmp_path):
    (tmp_path / "requirements.txt").write_bytes(b"requests\n")
    z = make_zip({"legal-leads-bot/requirements.txt": b"requests\n", "legal-leads-bot/b.py": b"2"})
    pips = []
    res = run_update(tmp_path, session=FakeSession("fff", z), pip=pips.append)
    assert res.updated and res.files == 1 and pips == [] and not res.pip_ran


def test_download_error_is_reported(tmp_path):
    class Down(FakeSession):
        def get(self, url, **kw):
            return FakeResp(status=404) if "codeload" in url else FakeResp(json_data={"sha": "x"})
    with pytest.raises(UpdateError, match="HTTP 404"):
        run_update(tmp_path, session=Down("x", b""))


def test_update_command_restarts_and_acks_offset(settings):
    from leadsbot.bot import LeadsBot
    from leadsbot.storage import Store

    class TG:
        def __init__(self):
            self.sent, self.calls = [], []
        def send_message(self, chat, text, **kw):
            self.sent.append(text)
        def get_updates(self, offset=None, timeout=30):
            self.calls.append((offset, timeout))
            if len(self.calls) == 1:
                return [{"update_id": 77, "message": {"chat": {"id": 42}, "text": "/update"}}]
            return []

    tg = TG()
    bot = LeadsBot(settings, Store(settings.db_path), tg)
    fake = SimpleNamespace(updated=True, message="Yeniləndi: 3 fayl, versiya abc1234.")
    with patch("leadsbot.bot.run_update", lambda *a, **k: fake), \
         patch("leadsbot.bot.maybe_send_digest", lambda *a, **k: False):
        with pytest.raises(RestartRequested):
            bot.run_forever(run_first=False)
    assert tg.calls[-1] == (78, 0)  # /update oxundu kimi təsdiqləndi
    assert "Yeniləndi" in tg.sent[-1] and "Yenidən başlayıram" in tg.sent[-1]


def test_update_command_reports_failure_and_keeps_running(settings):
    from leadsbot.bot import LeadsBot
    from leadsbot.storage import Store
    from test_bot import FakeTG, upd

    bot = LeadsBot(settings, Store(settings.db_path), FakeTG())

    def boom(*a, **k):
        raise UpdateError("GitHub-a qoşulmadı (ConnectionError)")

    with patch("leadsbot.bot.run_update", boom):
        bot.handle(upd(42, "/update"))
    assert "alınmadı" in bot.tg.sent[-1][1]
    with pytest.raises(RestartRequested):
        bot.handle(upd(42, "/restart"))


def test_serve_returns_restart_code(settings, monkeypatch, tmp_path):
    from leadsbot import __main__ as cli

    class TG:
        def __init__(self, *a, **k):
            pass
        def get_me(self):
            return {"username": "x_bot"}

    class Bot:
        def __init__(self, *a, **k):
            pass
        def run_forever(self, run_first=True):
            raise RestartRequested()

    monkeypatch.setattr(cli, "TelegramClient", TG)
    monkeypatch.setattr("leadsbot.bot.LeadsBot", Bot)
    assert cli.cmd_serve(SimpleNamespace(no_first_run=True), settings) == updater.RESTART_EXIT_CODE


def test_bat_files_keep_crlf_and_restart_loop():
    root = Path(__file__).resolve().parent.parent
    start = (root / "start.bat").read_bytes()
    assert b"\r\n" in start and b":run" in start and b"if errorlevel 42 if not errorlevel 43" in start
    assert b"leadsbot update" in (root / "update.bat").read_bytes()
