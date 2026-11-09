"""Şirkət xəbərləri: kömək istəmək deyil, ona görə yalnız səhər siqnalı kimi və yalnız Claude əmin olanda gəlir."""
from datetime import datetime, timezone

import pytest

from leadsbot.ai import AIError, LeadScore
from leadsbot.config import DEFAULT_LEAD_TYPES
from leadsbot.models import Item, Source
from leadsbot.runner import maybe_send_digest
from leadsbot.storage import Store
from test_runner import FakeTG, run

NEWS = Source(id="n", name="News", type="rss", url="https://x", category="company", categories=["company", "dispute"],
              require_geo=False)
FORUM = Source(id="f", name="Forum", type="rss", url="https://x", category="individual", categories=["individual"],
               require_geo=False)
JV = "CSG establishes a joint venture in Azerbaijan"
ASK = "Need a lawyer for a residence permit in Baku"
EARLY = datetime(2026, 11, 9, 4, 0, tzinfo=timezone.utc)  # Bakı 08:00
AT_NINE = datetime(2026, 11, 9, 5, 1, tzinfo=timezone.utc)  # Bakı 09:01
NAMES = {"n": "News", "f": "Forum"}


class AI:
    def __init__(self, value=9, category="company", fail=False):
        self.value, self.category, self.fail = value, category, fail

    def score(self, items, negatives=None):
        if self.fail:
            raise AIError("down")
        return {it["id"]: LeadScore(it["id"], self.value, self.category, "Filial", "Xülasə", "Səbəb") for it in items}


def posts(*titles):
    def _fetch(src, ua, timeout, session=None):
        return [Item(src.id, t, t, f"https://x/{i}", "") for i, t in enumerate(titles)]
    return _fetch


def nothing(src, ua, timeout, session=None):
    return []


@pytest.fixture
def live(settings):
    """Real parametrlər: siqnal rejimi açıqdır, növlər defoltdur."""
    settings.signal_min_score = 9
    settings.lead_types = DEFAULT_LEAD_TYPES
    return settings


def seeded(settings, matcher, src=NEWS):
    store = Store(settings.db_path)
    run(settings, store, [src], matcher, FakeTG(), fetch=nothing)
    return store


def test_news_sources_are_read_by_default(live, matcher):
    calls = []

    def fetch(src, ua, timeout, session=None):
        calls.append(src.id)
        return []

    run(live, Store(live.db_path), [NEWS], matcher, FakeTG(), fetch=fetch)
    assert calls == ["n"]


def test_a_confident_signal_waits_for_the_morning_and_arrives_once(live, matcher):
    store = seeded(live, matcher)
    tg = FakeTG()
    rep = run(live, store, [NEWS], matcher, tg, fetch=posts(JV), ai=AI())
    assert rep.sent == 0 and rep.queued == 1 and tg.sent == []
    assert maybe_send_digest(live, store, tg, ["42"], NAMES, now_utc=EARLY) is False
    assert maybe_send_digest(live, store, tg, ["42"], NAMES, now_utc=AT_NINE) is True
    text = tg.sent[-1][1]
    assert "Şirkət siqnalları" in text and JV in text and "hələ kömək istəməyib" in text
    assert maybe_send_digest(live, store, tg, ["42"], NAMES, now_utc=AT_NINE) is False


def test_a_less_certain_signal_is_not_sent_at_all(live, matcher):
    store = seeded(live, matcher)
    tg = FakeTG()
    rep = run(live, store, [NEWS], matcher, tg, fetch=posts(JV), ai=AI(value=8))
    assert rep.queued == 0 and rep.filtered == 1 and store.stats()["digest_queue"] == 0


def test_no_signals_without_claude(live, matcher):
    store = seeded(live, matcher)
    tg = FakeTG()
    rep = run(live, store, [NEWS], matcher, tg, fetch=posts(JV))
    assert rep.sent == 0 and rep.queued == 0 and tg.sent == []


def test_no_signals_when_claude_fails(live, matcher):
    store = seeded(live, matcher)
    tg = FakeTG()
    rep = run(live, store, [NEWS], matcher, tg, fetch=posts(JV), ai=AI(fail=True))
    assert rep.sent == 0 and rep.queued == 0 and tg.sent == []


def test_a_real_request_is_not_delayed_until_morning(live, matcher):
    store = seeded(live, matcher, FORUM)
    tg = FakeTG()
    rep = run(live, store, [FORUM], matcher, tg, fetch=posts(ASK), ai=AI(category="individual"))
    assert rep.sent == 1 and rep.queued == 0


def test_claude_can_turn_a_keyword_request_into_a_signal(live, matcher):
    store = seeded(live, matcher, FORUM)
    tg = FakeTG()
    rep = run(live, store, [FORUM], matcher, tg, fetch=posts(ASK), ai=AI(category="company"))
    assert rep.sent == 0 and rep.queued == 1


def test_no_empty_morning_message_when_there_are_no_signals(live, matcher):
    store = seeded(live, matcher)
    tg = FakeTG()
    assert maybe_send_digest(live, store, tg, ["42"], NAMES, now_utc=AT_NINE) is False and tg.sent == []


def test_a_digest_the_lawyer_turned_on_still_reports_an_empty_day(live, matcher):
    live.digest_time = "09:00"
    store = seeded(live, matcher)
    tg = FakeTG()
    assert maybe_send_digest(live, store, tg, ["42"], NAMES, now_utc=AT_NINE) is True
    assert "yeni lid yoxdur" in tg.sent[-1][1]


def test_signals_can_be_switched_off(settings, matcher):
    store = seeded(settings, matcher)  # conftest: signal_min_score=0
    tg = FakeTG()
    assert maybe_send_digest(settings, store, tg, ["42"], NAMES, now_utc=AT_NINE) is False
    rep = run(settings, store, [NEWS], matcher, tg, fetch=posts(JV), ai=AI())
    assert rep.sent == 1
