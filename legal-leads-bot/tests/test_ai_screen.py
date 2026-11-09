"""Claude forum və alert yazılarını açar sözsüz oxuyanda nə olur."""
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import anthropic
import httpx2
import pytest

from leadsbot.ai import AIError, LeadAI, LeadScore
from leadsbot.config import DEFAULT_LEAD_TYPES, ROOT, load_sources
from leadsbot.models import Item, Source
from leadsbot.sources import parse_rss
from leadsbot.storage import Store
from test_runner import FakeTG, run

FORUM = Source(id="f", name="Forum", type="rss", url="https://x", category="individual", categories=["individual"],
               require_geo=False, ai_screen=True)
PLAIN_SOURCE = Source(id="p", name="Plain", type="rss", url="https://x", category="individual", categories=["individual"],
                      require_geo=False)
PLAIN = "Məni işdən çıxardılar, nə edə bilərəm?"
WITH_WORDS = "Need a lawyer for a residence permit in Baku"


class ScoringAI:
    def __init__(self, value=8, category="individual", fail=False):
        self.value, self.category, self.fail = value, category, fail
        self.calls = []

    def score(self, items, negatives=None):
        self.calls.append(items)
        if self.fail:
            raise AIError("down")
        return {it["id"]: LeadScore(it["id"], self.value, self.category, "Əmək", "Xülasə", "Səbəb") for it in items}


def posts(*titles):
    def _fetch(src, ua, timeout, session=None):
        return [Item(src.id, t, t, f"https://x/{i}", "") for i, t in enumerate(titles)]
    return _fetch


def nothing(src, ua, timeout, session=None):
    return []


def seeded(settings, matcher, src=FORUM):
    store = Store(settings.db_path)
    run(settings, store, [src], matcher, FakeTG(), fetch=nothing)
    return store


def test_samples_are_what_the_tests_assume(matcher):
    assert matcher.evaluate(PLAIN, "individual", False, ["individual"]) is None
    assert matcher.evaluate(WITH_WORDS, "individual", False, ["individual"]) is not None


def test_claude_reads_a_plainly_worded_question_and_it_reaches_telegram(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    rep = run(settings, store, [FORUM], matcher, tg, fetch=posts(PLAIN), ai=ScoringAI())
    assert rep.sent == 1 and "8/10" in tg.sent[0][1]


def test_without_claude_the_same_post_is_not_sent(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    rep = run(settings, store, [FORUM], matcher, tg, fetch=posts(PLAIN))
    assert rep.total_matched == 0 and tg.sent == []


def test_only_marked_sources_are_opened_to_claude(settings, matcher):
    store = seeded(settings, matcher, PLAIN_SOURCE)
    ai = ScoringAI()
    rep = run(settings, store, [PLAIN_SOURCE], matcher, FakeTG(), fetch=posts(PLAIN), ai=ai)
    assert rep.total_matched == 0 and ai.calls == []


def test_low_score_stays_out_of_telegram(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    rep = run(settings, store, [FORUM], matcher, tg, fetch=posts(PLAIN), ai=ScoringAI(value=2))
    assert rep.sent == 0 and rep.filtered == 1 and tg.sent == []


def test_first_read_of_a_source_costs_nothing(settings, matcher):
    store = Store(settings.db_path)
    ai = ScoringAI()
    rep = run(settings, store, [FORUM], matcher, FakeTG(), fetch=posts(PLAIN), ai=ai)
    assert rep.total_matched == 0 and ai.calls == []


def test_when_claude_fails_nothing_noisy_is_sent_and_the_post_is_retried(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    rep = run(settings, store, [FORUM], matcher, tg, fetch=posts(PLAIN), ai=ScoringAI(fail=True))
    assert rep.ai_error == "down" and rep.sent == 0 and tg.sent == [] and store.pending_count() == 1
    rep = run(settings, store, [FORUM], matcher, tg, fetch=nothing, ai=ScoringAI())
    assert rep.sent == 1 and rep.ai_scored == 1


def test_a_post_claude_could_not_read_for_two_days_is_dropped(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    run(settings, store, [FORUM], matcher, tg, fetch=posts(PLAIN), ai=ScoringAI(fail=True))
    old = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    store.conn.execute("UPDATE items SET first_seen=?", (old,))
    store.conn.commit()
    run(settings, store, [FORUM], matcher, tg, fetch=nothing, ai=ScoringAI(fail=True))
    assert tg.sent == [] and store.pending_count() == 0


def test_a_waiting_post_is_not_sent_if_claude_is_switched_off(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    run(settings, store, [FORUM], matcher, tg, fetch=posts(PLAIN), ai=ScoringAI(fail=True))
    run(settings, store, [FORUM], matcher, tg, fetch=nothing)
    assert tg.sent == [] and store.pending_count() == 0


def test_a_lead_with_keywords_is_still_sent_when_claude_fails(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    rep = run(settings, store, [FORUM], matcher, tg, fetch=posts(WITH_WORDS), ai=ScoringAI(fail=True))
    assert rep.sent == 1 and "/10" not in tg.sent[0][1]


@pytest.mark.parametrize("title", [PLAIN, WITH_WORDS])
def test_company_news_is_hidden_when_claude_says_so(settings, matcher, title):
    settings.lead_types = DEFAULT_LEAD_TYPES
    store = seeded(settings, matcher)
    tg = FakeTG()
    rep = run(settings, store, [FORUM], matcher, tg, fetch=posts(title), ai=ScoringAI(value=9, category="company"))
    assert rep.sent == 0 and rep.hidden == 1 and tg.sent == []


def test_company_news_arrives_if_the_lawyer_turned_it_on(settings, matcher):
    store = seeded(settings, matcher)  # conftest: bütün növlər açıqdır
    tg = FakeTG()
    rep = run(settings, store, [FORUM], matcher, tg, fetch=posts(PLAIN), ai=ScoringAI(value=9, category="company"))
    assert rep.sent == 1


def test_claude_outage_is_reported_once_and_recovery_too(settings, matcher):
    store = seeded(settings, matcher)
    tg = FakeTG()
    for i in range(4):
        run(settings, store, [FORUM], matcher, tg, fetch=posts(f"{PLAIN} {i}"), ai=ScoringAI(fail=True))
    assert len([m for _, m, _ in tg.sent if "ardıcıl işləmədi" in m]) == 1
    run(settings, store, [FORUM], matcher, tg, fetch=nothing, ai=ScoringAI())
    assert len([m for _, m, _ in tg.sent if "yenidən işləyir" in m]) == 1


def test_a_cycle_with_no_work_for_claude_does_not_count_as_failure_or_recovery(settings, matcher):
    store = seeded(settings, matcher)
    store.set("fails:claude", "2")
    run(settings, store, [FORUM], matcher, FakeTG(), fetch=nothing, ai=ScoringAI())
    assert store.get("fails:claude") == "2"


def test_google_alerts_feeds_are_opened_to_claude_but_other_rss_is_not(settings):
    store = Store(settings.db_path)
    for sid, url in (("a", "https://www.google.com/alerts/feeds/1/2"), ("b", "https://example.az/feed")):
        store.add_user_source(Source(id=sid, name=sid, type="rss", url=url, category="individual"))
    assert {s.id: s.ai_screen for s in store.user_sources()} == {"a": True, "b": False}


def test_people_question_sources_are_marked_in_the_config():
    screened = {s.id for s in load_sources(ROOT / "config" / "sources.yaml") if s.ai_screen}
    assert {"huquqlar_rss", "pravoved_az", "expat_az_forum_all"} <= screened and len(screened) == 7


def test_google_alert_link_points_to_the_real_site():
    href = "https://www.google.com/url?rct=j&amp;sa=t&amp;url=https://example.az/post/1&amp;ct=ga&amp;usg=x"
    feed = ('<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>x</id><title>t</title>'
            f'<entry><id>e1</id><title type="html">Salam</title><link href="{href}" />'
            "<published>2026-11-09T10:00:00Z</published></entry></feed>")
    item = parse_rss(feed.encode("utf-8"), FORUM)[0]
    assert item.link == "https://example.az/post/1" and item.origin == "example.az"


# ── LeadAI ──

def _reply(payload):
    return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=json.dumps(payload))])


def _scored(kw):
    ids = [p["id"] for p in json.loads(kw["messages"][0]["content"].split("(JSON):", 1)[1])]
    return _reply({"items": [{"id": i, "score": 7, "category": "individual", "service": "s", "summary_az": "a",
                              "reason_az": "r"} for i in ids]})


class Flaky:
    def __init__(self, failing_calls):
        self.failing_calls, self.calls = failing_calls, 0

    def create(self, **kw):
        self.calls += 1
        if self.calls in self.failing_calls:
            raise anthropic.APIConnectionError(request=httpx2.Request("POST", "https://x"))
        return _scored(kw)


def test_one_failed_batch_does_not_lose_the_others():
    client = SimpleNamespace(messages=Flaky({1}))
    out = LeadAI("k", "claude-haiku-5-5", client=client).score([{"id": i, "title": str(i)} for i in range(25)])
    assert sorted(out) == list(range(20, 25))


def test_all_batches_failing_is_an_error():
    client = SimpleNamespace(messages=Flaky({1, 2}))
    with pytest.raises(AIError):
        LeadAI("k", "claude-haiku-5-5", client=client).score([{"id": i, "title": str(i)} for i in range(25)])


def _bad_request(message):
    response = httpx2.Response(400, request=httpx2.Request("POST", "https://x"))
    return anthropic.BadRequestError(message, response=response, body=None)


class Rejecting:
    def __init__(self, error):
        self.error, self.calls = error, 0

    def create(self, **kw):
        self.calls += 1
        raise self.error


class Fine:
    def __init__(self):
        self.calls = 0

    def create(self, **kw):
        self.calls += 1
        return _scored(kw)


def test_an_empty_balance_does_not_switch_refusal_fallbacks_off():
    beta, plain = Rejecting(_bad_request("Your credit balance is too low")), Fine()
    client = SimpleNamespace(messages=plain, beta=SimpleNamespace(messages=beta))
    ai = LeadAI("k", "claude-opus-5-5", client=client)
    with pytest.raises(AIError):
        ai.score([{"id": 1, "title": "x"}])
    assert ai.use_fallbacks is True and plain.calls == 0


def test_a_rejected_fallback_parameter_retries_without_it():
    beta, plain = Rejecting(_bad_request("fallbacks: unexpected field")), Fine()
    client = SimpleNamespace(messages=plain, beta=SimpleNamespace(messages=beta))
    ai = LeadAI("k", "claude-opus-5-5", client=client)
    assert set(ai.score([{"id": 1, "title": "x"}])) == {1}
    assert ai.use_fallbacks is False and plain.calls == 1
