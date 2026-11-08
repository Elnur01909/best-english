from datetime import date, datetime, timezone
from unittest.mock import patch

from conftest import fixture_bytes
from leadsbot.ai import AIError, LeadScore
from leadsbot.models import Item, Source
from leadsbot.runner import maybe_send_digest, run_cycle
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
        self.sent.append((chat_id, text, kw))


class FakeAI:
    def __init__(self, scores=None, fail=False):
        self.scores = scores or {}
        self.fail = fail
        self.calls = []

    def score(self, items, negatives=None):
        self.calls.append((items, negatives))
        if self.fail:
            raise AIError("down")
        out = {}
        for it in items:
            for needle, sc in self.scores.items():
                if needle in it["title"]:
                    out[it["id"]] = LeadScore(it["id"], sc, "company", "MMC qeydiyyatı", f"Xülasə: {needle}", "Səbəb")
        return out


SRC = Source(id="g", name="Google test", type="gnews", query="x", category="company", require_geo=True)
RED = Source(id="r", name="Reddit test", type="rss", url="https://x", category="individual", require_geo=False)


def fake_fetch(src, ua, timeout, session=None):
    if src.id == "g":
        return parse_rss(fixture_bytes("gnews.xml"), src)
    if src.id == "r":
        return parse_rss(fixture_bytes("reddit.xml"), src)
    raise FetchError("down")


def fresh(prefix):
    """Fixture elementlərini yeni uid və yeni başlıqlarla qaytaran fetch (təkrar sayılmasın)."""
    def _fetch(src, ua, timeout, session=None):
        items = fake_fetch(src, ua, timeout)
        for i, it in enumerate(items):
            it.uid = f"{prefix}-{i}"
            it.title = f"{prefix} {i} {it.title}"
        return items
    return _fetch


def run(settings, store, sources, matcher, tg=None, fetch=fake_fetch, **kw):
    with patch("leadsbot.runner.fetch_source", fetch):
        return run_cycle(settings, store, sources, matcher, tg, ["42"] if tg else [], **kw)


def test_first_run_is_baseline_and_sends_nothing(settings, matcher):
    store = Store(settings.db_path)
    tg = FakeTG()
    rep = run(settings, store, [SRC, RED], matcher, tg)
    assert all(s.baseline for s in rep.sources)
    assert rep.total_new == 6 and rep.total_matched == 3
    assert rep.sent == 0 and tg.sent == [] and store.pending_count() == 0


def test_second_run_sends_only_new_matches_with_cap_and_buttons(settings, matcher):
    store = Store(settings.db_path)
    tg = FakeTG()
    run(settings, store, [SRC], matcher, tg)
    rep = run(settings, store, [SRC], matcher, tg, fetch=fresh("v2"))
    assert rep.total_new == 4 and rep.total_matched == 2
    assert rep.sent == 2 and len(tg.sent) == 2  # max_per_cycle=2
    texts = [t for _, t, _ in tg.sent]
    assert any("Vulcan" in t for t in texts) and any("Dutch AI firm" in t for t in texts)
    kb = tg.sent[0][2]["reply_markup"]["inline_keyboard"]
    assert [b["callback_data"].split(":")[2] for row in kb for b in row] == ["i", "c", "x", "d"]
    rep = run(settings, store, [SRC], matcher, tg, fetch=fresh("v2"))
    assert rep.total_new == 0 and rep.sent == 0


def test_same_story_from_two_sources_is_sent_once(settings, matcher):
    store = Store(settings.db_path)
    other = Source(id="g2", name="Google 2", type="gnews", query="y", category="company", require_geo=True)

    def fetch(src, ua, timeout, session=None):
        items = parse_rss(fixture_bytes("gnews.xml"), src)
        for it in items:
            it.uid = f"{src.id}-{it.uid}-new"
            it.title = it.title.replace(" - World Oil", " - Another Paper")  # eyni xəbər, fərqli nəşr
        return items

    def baseline(src, ua, timeout, session=None):
        return parse_rss(fixture_bytes("gnews.xml"), src)

    run(settings, store, [SRC, other], matcher, FakeTG(), fetch=baseline)
    tg = FakeTG()
    settings.max_per_cycle = 10
    rep = run(settings, store, [SRC, other], matcher, tg, fetch=fetch)
    # başlıqlar (nəşr adı fərqli olsa da) artıq bazadadır → hamısı təkrar sayılır
    assert rep.total_duplicates == 4 and rep.sent == 0 and tg.sent == []


def test_new_story_seen_by_two_sources_in_same_cycle_is_sent_once(settings, matcher):
    store = Store(settings.db_path)
    other = Source(id="g2", name="Google 2", type="gnews", query="y", category="company", require_geo=True)

    def base(src, ua, timeout, session=None):
        return parse_rss(fixture_bytes("gnews.xml"), src)

    run(settings, store, [SRC, other], matcher, FakeTG(), fetch=base)

    def news(src, ua, timeout, session=None):
        paper = {"g": "Reuters", "g2": "Trend News Agency"}[src.id]
        return [Item(src.id, f"{src.id}-n1", f"Acme Corp opens new office in Baku - {paper}",
                     "https://example.com/" + src.id, "Acme expands")]

    tg = FakeTG()
    rep = run(settings, store, [SRC, other], matcher, tg, fetch=news)
    assert rep.total_matched == 2 and rep.total_duplicates == 1 and rep.sent == 1


def test_queue_survives_telegram_failure(settings, matcher):
    store = Store(settings.db_path)
    run(settings, store, [RED], matcher, FakeTG())
    rep = run(settings, store, [RED], matcher, FakeTG(fail=True), fetch=fresh("v2"))
    assert rep.sent == 0 and rep.pending == 1 and rep.send_errors
    rep = run(settings, store, [RED], matcher, FakeTG(), fetch=fresh("v2"))
    assert rep.sent == 1 and rep.pending == 0


def test_source_error_does_not_stop_cycle(settings, matcher):
    store = Store(settings.db_path)
    broken = Source(id="x", name="Broken", type="rss", url="https://x", category="company")
    rep = run(settings, store, [broken, SRC], matcher, FakeTG())
    assert rep.sources[0].error == "down" and rep.sources[1].fetched == 4
    assert store.source_states()["x"]["last_status"] == "error"


def test_dry_run_prints_and_keeps_pending(settings, matcher, capsys):
    store = Store(settings.db_path)
    run(settings, store, [RED], matcher, None, send=False, seed_only=True)
    rep = run(settings, store, [RED], matcher, None, fetch=fresh("v3"), send=False, dry_run=True)
    out = capsys.readouterr().out
    assert "Need an English speaking lawyer" in out and rep.sent == 1
    assert store.pending_count() == 1


def test_muted_and_expired_sources_are_skipped(settings, matcher):
    store = Store(settings.db_path)
    store.set_source_enabled("g", False)
    old = Source(id="r", name="Reddit", type="rss", url="https://x", category="individual",
                 require_geo=False, disable_after="2026-11-12")
    rep = run(settings, store, [SRC, old], matcher, FakeTG(), today=date(2026, 11, 13))
    assert rep.sources[0].skipped and rep.sources[0].fetched == 0
    assert rep.sources[1].expired and rep.sources[1].fetched == 0
    assert "Müddəti bitdiyi" in rep.summary_text()
    rep = run(settings, store, [old], matcher, FakeTG(), today=date(2026, 11, 12))
    assert rep.sources[0].fetched == 2


def test_source_categories_limit_matching(settings, matcher):
    store = Store(settings.db_path)
    # Reddit postu 'lawyer' + 'residence permit' ehtiva edir; yalnız 'job' sayılan mənbədə uyğun gəlməməlidir
    jobs_only = Source(id="r", name="R", type="rss", url="https://x", category="job",
                       categories=["job"], require_geo=False)
    rep = run(settings, store, [jobs_only], matcher, None, send=False, seed_only=True)
    assert rep.total_matched == 1  # 'lawyer' job siyahısında da var
    row = store.recent_matches(5)[0]
    assert row["category"] == "job" and "residence permit" not in (row["hits"] or "")


# ── Claude ──

def test_ai_filters_low_scores_and_shows_summary(settings, matcher):
    store = Store(settings.db_path)
    run(settings, store, [SRC], matcher, FakeTG())
    ai = FakeAI({"Vulcan": 9, "Dutch AI firm": 3})
    tg = FakeTG()
    rep = run(settings, store, [SRC], matcher, tg, fetch=fresh("ai"), ai=ai)
    assert rep.ai_scored == 2 and rep.filtered == 1 and rep.sent == 1
    assert "9/10" in tg.sent[0][1] and "Xülasə: Vulcan" in tg.sent[0][1] and "MMC qeydiyyatı" in tg.sent[0][1]
    assert store.stats()["low"] == 1


def test_ai_error_sends_unscored(settings, matcher):
    store = Store(settings.db_path)
    run(settings, store, [RED], matcher, FakeTG())
    tg = FakeTG()
    rep = run(settings, store, [RED], matcher, tg, fetch=fresh("e"), ai=FakeAI(fail=True))
    assert rep.ai_error == "down" and rep.sent == 1 and "/10" not in tg.sent[0][1]


def test_ai_gets_negative_examples(settings, matcher):
    store = Store(settings.db_path)
    run(settings, store, [RED], matcher, FakeTG())
    run(settings, store, [RED], matcher, FakeTG(), fetch=fresh("n1"))
    lead = store.recent_matches(1)[0]
    store.set_status(lead["id"], "not_relevant")
    ai = FakeAI({"lawyer": 7})
    run(settings, store, [RED], matcher, FakeTG(), fetch=fresh("n2"), ai=ai)
    assert ai.calls and lead["title"] in ai.calls[0][1]


# ── səhər xülasəsi ──

def test_digest_mode_queues_and_sends_once_per_day(settings, matcher):
    settings.digest_time = "09:00"
    settings.max_per_cycle = 10
    store = Store(settings.db_path)
    run(settings, store, [SRC], matcher, FakeTG())
    tg = FakeTG()
    rep = run(settings, store, [SRC], matcher, tg, fetch=fresh("d"), ai=FakeAI({"Vulcan": 9, "Dutch AI firm": 7}))
    assert rep.sent == 1 and rep.queued == 1  # 9 ≥ instant_min_score(8) dərhal, 7 xülasəyə
    names = {"g": "Google test"}
    early = datetime(2026, 11, 9, 4, 0, tzinfo=timezone.utc)  # Bakı 08:00
    assert maybe_send_digest(settings, store, tg, ["42"], names, now_utc=early) is False
    at9 = datetime(2026, 11, 9, 5, 1, tzinfo=timezone.utc)  # Bakı 09:01
    assert maybe_send_digest(settings, store, tg, ["42"], names, now_utc=at9) is True
    digest = tg.sent[-1][1]
    assert "Səhər xülasəsi" in digest and "Dutch AI firm" in digest and "7/10" in digest and "/l" in digest
    assert maybe_send_digest(settings, store, tg, ["42"], names, now_utc=at9) is False
    assert store.stats()["digest_queue"] == 0


def test_digest_without_ai_queues_everything(settings, matcher):
    settings.digest_time = "09:00"
    store = Store(settings.db_path)
    run(settings, store, [SRC], matcher, FakeTG())
    tg = FakeTG()
    rep = run(settings, store, [SRC], matcher, tg, fetch=fresh("q"))
    assert rep.sent == 0 and rep.queued == 2


def test_runtime_digest_override(settings, matcher):
    store = Store(settings.db_path)
    store.set("digest_time", "08:30")
    from leadsbot.runner import effective_digest_time
    assert effective_digest_time(settings, store) == "08:30"
    store.set("digest_time", "off")
    settings.digest_time = "09:00"
    assert effective_digest_time(settings, store) == ""
