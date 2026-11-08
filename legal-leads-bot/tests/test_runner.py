from unittest.mock import patch

from conftest import fixture_bytes
from leadsbot.models import Source
from leadsbot.runner import run_cycle
from leadsbot.sources import FetchError, parse_rss
from leadsbot.storage import Store


class FakeTG:
    def __init__(self, fail=False):
        self.sent = []
        self.fail = fail

    def send_message(self, chat_id, text, **kw):
        if self.fail:
            from leadsbot.telegram import TelegramError
            raise TelegramError("boom")
        self.sent.append((chat_id, text))


SRC = Source(id="g", name="Google test", type="gnews", query="x", category="company", require_geo=True)
RED = Source(id="r", name="Reddit test", type="rss", url="https://x", category="individual", require_geo=False)


def fake_fetch(src, ua, timeout, session=None):
    if src.id == "g":
        return parse_rss(fixture_bytes("gnews.xml"), src)
    if src.id == "r":
        return parse_rss(fixture_bytes("reddit.xml"), src)
    raise FetchError("down")


def test_first_run_is_baseline_and_sends_nothing(settings, matcher):
    store = Store(settings.db_path)
    tg = FakeTG()
    with patch("leadsbot.runner.fetch_source", fake_fetch):
        rep = run_cycle(settings, store, [SRC, RED], matcher, tg, ["42"])
    assert all(s.baseline for s in rep.sources)
    assert rep.total_new == 6 and rep.total_matched == 3
    assert rep.sent == 0 and tg.sent == [] and store.pending_count() == 0


def test_second_run_sends_only_new_matches_with_cap(settings, matcher):
    store = Store(settings.db_path)
    tg = FakeTG()
    with patch("leadsbot.runner.fetch_source", fake_fetch):
        run_cycle(settings, store, [SRC], matcher, tg, ["42"])

    def newer(src, ua, timeout, session=None):
        items = parse_rss(fixture_bytes("gnews.xml"), src)
        for i, it in enumerate(items):
            it.uid = f"new-{i}"
        return items

    with patch("leadsbot.runner.fetch_source", newer):
        rep = run_cycle(settings, store, [SRC], matcher, tg, ["42"])
    assert rep.total_new == 4 and rep.total_matched == 2
    assert rep.sent == 2 and len(tg.sent) == 2  # max_per_cycle=2 in fixture settings
    texts = [t for _, t in tg.sent]
    assert any("Vulcan" in t for t in texts) and any("Dutch AI firm" in t for t in texts)
    assert all("Linki aç" in t for t in texts)
    assert store.pending_count() == 0

    # third run: nothing new → nothing sent
    with patch("leadsbot.runner.fetch_source", newer):
        rep = run_cycle(settings, store, [SRC], matcher, tg, ["42"])
    assert rep.total_new == 0 and rep.sent == 0


def test_queue_survives_telegram_failure(settings, matcher):
    store = Store(settings.db_path)
    with patch("leadsbot.runner.fetch_source", fake_fetch):
        run_cycle(settings, store, [RED], matcher, FakeTG(), ["42"])
    def newer(src, ua, timeout, session=None):
        items = parse_rss(fixture_bytes("reddit.xml"), src)
        for it in items:
            it.uid += "-v2"
        return items
    bad = FakeTG(fail=True)
    with patch("leadsbot.runner.fetch_source", newer):
        rep = run_cycle(settings, store, [RED], matcher, bad, ["42"])
    assert rep.sent == 0 and rep.pending == 1 and rep.send_errors
    good = FakeTG()
    with patch("leadsbot.runner.fetch_source", newer):
        rep = run_cycle(settings, store, [RED], matcher, good, ["42"])
    assert rep.sent == 1 and rep.pending == 0


def test_source_error_does_not_stop_cycle(settings, matcher):
    store = Store(settings.db_path)
    broken = Source(id="x", name="Broken", type="rss", url="https://x", category="company")
    with patch("leadsbot.runner.fetch_source", fake_fetch):
        rep = run_cycle(settings, store, [broken, SRC], matcher, FakeTG(), ["42"])
    assert rep.sources[0].error == "down" and rep.sources[1].fetched == 4
    assert store.source_states()["x"]["last_status"] == "error"


def test_dry_run_prints_and_keeps_pending(settings, matcher, capsys):
    store = Store(settings.db_path)
    with patch("leadsbot.runner.fetch_source", fake_fetch):
        run_cycle(settings, store, [RED], matcher, None, [], send=False, seed_only=True)
    def newer(src, ua, timeout, session=None):
        items = parse_rss(fixture_bytes("reddit.xml"), src)
        for it in items:
            it.uid += "-v3"
        return items
    with patch("leadsbot.runner.fetch_source", newer):
        rep = run_cycle(settings, store, [RED], matcher, None, [], send=False, dry_run=True)
    out = capsys.readouterr().out
    assert "Need an English speaking lawyer" in out and rep.sent == 1
    assert store.pending_count() == 1  # dry run does not mark as sent


def test_muted_source_is_skipped(settings, matcher):
    store = Store(settings.db_path)
    store.set_source_enabled("g", False)
    with patch("leadsbot.runner.fetch_source", fake_fetch):
        rep = run_cycle(settings, store, [SRC], matcher, FakeTG(), ["42"])
    assert rep.sources[0].skipped and rep.sources[0].fetched == 0
