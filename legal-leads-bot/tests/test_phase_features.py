import sqlite3
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from conftest import fixture_text
from leadsbot.ai import AIError, LeadAI, template_draft
from leadsbot.lock import SingleInstance
from leadsbot.models import Item, Source, normalize_tg_handle
from leadsbot.sources import build_url, parse_tg_channel
from leadsbot.storage import Store, title_key


# ── Telegram kanalı ──

def test_tg_channel_parser(matcher):
    src = Source(id="tg_x", name="x", type="tg_channel", channel="hellojob_test", category="job",
                 categories=["job"], require_geo=False)
    assert build_url(src) == "https://t.me/s/hellojob_test"
    items = parse_tg_channel(fixture_text("tg_channel.html"), src)
    assert [i.uid for i in items] == ["tg:hellojob_test/103", "tg:hellojob_test/101"]  # ən yeni birinci
    lawyer = items[1]
    assert lawyer.title == "Senior Lawyer" and lawyer.link == "https://t.me/hellojob_test/101"
    assert "Azerbaijani law" in lawyer.summary and lawyer.origin == "HelloJob Vakansiyalar"
    assert matcher.evaluate(lawyer.text, "job", False, ["job"]).category == "job"
    assert matcher.evaluate(items[0].text, "job", False, ["job"]) is None


@pytest.mark.parametrize("raw,expected", [
    ("@hellojob_az", "hellojob_az"), ("https://t.me/hellojob_az", "hellojob_az"),
    ("t.me/s/hellojob_az/123", "hellojob_az"), ("hellojob_az", "hellojob_az"),
    ("https://t.me/+abcdef", None), ("ab", None), ("", None),
])
def test_normalize_tg_handle(raw, expected):
    assert normalize_tg_handle(raw) == expected


def test_source_validation():
    with pytest.raises(ValueError):
        Source.from_dict({"id": "t", "name": "t", "type": "tg_channel", "channel": "x"})
    with pytest.raises(ValueError):
        Source.from_dict({"id": "t", "name": "t", "type": "rss", "url": "u", "categories": ["nope"]})
    with pytest.raises(ValueError):
        Source.from_dict({"id": "t", "name": "t", "type": "rss", "url": "u", "disable_after": "13.11.2026"})
    s = Source.from_dict({"id": "t", "name": "t", "type": "rss", "url": "u", "disable_after": "2026-11-12"})
    assert not s.expired(date(2026, 11, 12)) and s.expired(date(2026, 11, 13))


def test_default_config_has_job_and_news_sources(sources):
    ids = {s.id for s in sources}
    assert {"hellojob_az", "smartjob_az", "busy_az", "trend_rss", "azernews_rss"} <= ids
    reddit = [s for s in sources if s.id.startswith("reddit")]
    assert reddit and all(s.disable_after == "2026-11-12" for s in reddit)
    assert all(s.categories == ["job"] for s in sources if s.category == "job")


# ── baza ──

def test_title_key_strips_publisher_suffix():
    a = title_key("UK firm opens Baku office - World Oil")
    b = title_key("UK firm opens Baku office | Reuters")
    assert a == b == "uk firm opens baku office"


def test_old_database_is_migrated(tmp_path):
    db = tmp_path / "old.sqlite"
    con = sqlite3.connect(db)
    con.executescript("""
        CREATE TABLE items (source_id TEXT NOT NULL, uid TEXT NOT NULL, title TEXT, link TEXT, origin TEXT,
            published TEXT, category TEXT, score INTEGER DEFAULT 0, hits TEXT, matched INTEGER DEFAULT 0,
            sent INTEGER DEFAULT 0, first_seen TEXT NOT NULL, sent_at TEXT, PRIMARY KEY (source_id, uid));
        INSERT INTO items (source_id, uid, title, link, matched, sent, first_seen)
            VALUES ('g', 'u1', 'Acme opens Baku office - Trend', 'https://x', 1, 1, '2026-11-08T00:00:00+00:00');
    """)
    con.commit()
    con.close()
    store = Store(db)
    row = store.recent_matches(1)[0]
    assert row["title_key"] == "acme opens baku office" and row["status"] == "new" and row["ai_done"] == 0
    assert store.is_duplicate_title("acme opens baku office")
    Store(db)  # ikinci açılış da problemsiz


def test_user_sources_roundtrip(tmp_path):
    store = Store(tmp_path / "s.sqlite")
    src = Source(id="tg_abc_jobs", name="Telegram @abc_jobs", type="tg_channel", channel="abc_jobs",
                 category="job", categories=["job"], require_geo=False)
    assert store.add_user_source(src) and not store.add_user_source(src)
    [loaded] = store.user_sources()
    assert loaded.channel == "abc_jobs" and loaded.categories == ["job"] and loaded.user_added
    assert store.remove_user_source("tg_abc_jobs") and store.user_sources() == []


# ── Claude modulu (saxta client ilə) ──

class FakeMessages:
    def __init__(self, text, stop="end_turn"):
        self.text, self.stop, self.calls = text, stop, []

    def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(stop_reason=self.stop, content=[
            SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=self.text)])


def fake_client(text, stop="end_turn"):
    plain, beta = FakeMessages(text, stop), FakeMessages(text, stop)
    return SimpleNamespace(messages=plain, beta=SimpleNamespace(messages=beta)), plain, beta


def test_ai_score_parses_clamps_and_uses_fallbacks_for_opus():
    payload = ('{"items": [{"id": 1, "score": 14, "category": "company", "service": "MMC", "summary_az": "S",'
               ' "reason_az": "R"}, {"id": 99, "score": 5, "category": "job", "service": "", "summary_az": "",'
               ' "reason_az": ""}, {"id": 2, "score": 0, "category": "weird", "service": "x", "summary_az": "y",'
               ' "reason_az": "z"}]}')
    client, plain, beta = fake_client(payload)
    ai = LeadAI("k", "claude-opus-5-5", client=client)
    out = ai.score([{"id": 1, "title": "a"}, {"id": 2, "title": "b"}], negatives=["bad one"])
    assert set(out) == {1, 2}
    assert out[1].score == 10 and out[2].score == 1 and out[2].category == "other"
    call = beta.calls[0]
    assert call["fallbacks"] == "default" and call["betas"] == ["server-side-fallback-2026-07-01"]
    assert call["output_config"]["format"]["type"] == "json_schema" and call["output_config"]["effort"] == "low"
    assert "bad one" in call["messages"][0]["content"] and plain.calls == []


def test_ai_haiku_has_no_fallbacks_and_batches_of_20():
    client, plain, beta = fake_client('{"items": []}')
    ai = LeadAI("k", "claude-haiku-5-5", client=client)
    ai.score([{"id": i, "title": str(i)} for i in range(45)])
    assert len(plain.calls) == 3 and beta.calls == []


def test_ai_refusal_and_bad_json_raise():
    client, _, _ = fake_client("{}", stop="refusal")
    with pytest.raises(AIError):
        LeadAI("k", "claude-haiku-5-5", client=client).score([{"id": 1, "title": "x"}])
    client, _, _ = fake_client("not json")
    with pytest.raises(AIError):
        LeadAI("k", "claude-haiku-5-5", client=client).score([{"id": 1, "title": "x"}])


def test_ai_draft_and_template():
    client, plain, _ = fake_client("Dear team, ...")
    assert LeadAI("k", "claude-haiku-5-5", client=client).draft({"title": "X opens office"}) == "Dear team, ..."
    assert "[Your Name]" in template_draft("company", "X opens Baku office")
    assert "question about" in template_draft("individual", "Work permit help")


# ── kilid ──

def test_single_instance_lock(tmp_path):
    a, b = SingleInstance(tmp_path / "x.lock"), SingleInstance(tmp_path / "x.lock")
    assert a.acquire()
    assert not b.acquire()
    a.release()
    assert b.acquire()
    b.release()


def test_check_reports_each_source_as_it_finishes(settings, matcher):
    from leadsbot.runner import check_sources
    from leadsbot.sources import FetchError

    a = Source(id="a", name="A", type="rss", url="https://a", category="company")
    b = Source(id="b", name="B", type="rss", url="https://b", category="company")
    seen = []

    def fetch(src, ua, timeout, session=None):
        if src.id == "b":
            raise FetchError("HTTP 403 (b)")
        return [Item("a", "1", "Acme opens new office in Baku", "https://x")]

    with patch("leadsbot.runner.fetch_source", fetch):
        rows = check_sources(settings, [a, b], matcher, on_result=lambda r: seen.append(r["id"]))
    assert seen == ["a", "b"] and rows[0]["matched"] == 1 and rows[1]["error"] == "HTTP 403 (b)"
