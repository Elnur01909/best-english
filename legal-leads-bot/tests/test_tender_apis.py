"""Dünya Bankı və TED oxuyucuları (şəbəkəsiz)."""
import pytest

from leadsbot.config import ROOT, load_sources
from leadsbot.models import Source
from leadsbot.sources import build_url, fetch_source, parse_ted, parse_worldbank

WB = Source(id="wb", name="WB", type="worldbank_notices", query="Azerbaijan", category="tender", categories=["tender"],
            require_geo=False, ai_screen=True)
TED = Source(id="ted", name="TED", type="ted_notices", query="place-of-performance IN (AZE)", category="tender",
             categories=["tender"], require_geo=False, ai_screen=True)


def wb_notice(**kw):
    base = {
        "id": "OP1", "notice_type": "Request for Expression of Interest", "procurement_group": "CS",
        "bid_description": "Legal consultant for labour code review", "project_name": "Employment Support",
        "submission_date": "2026-11-07T00:00:00Z", "submission_deadline_date": "2026-11-20T00:00:00Z",
        "contact_organization": "Ministry of Labour", "notice_text": "<p><strong>Terms</strong> of reference</p>",
    }
    return {**base, **kw}


def test_world_bank_consultant_notice_becomes_an_item():
    item = parse_worldbank({"procnotices": [wb_notice()]}, WB)[0]
    assert item.uid == "OP1" and item.title == "Legal consultant for labour code review"
    assert item.link == "https://projects.worldbank.org/en/projects-operations/procurement-detail/OP1"
    assert item.published == "2026-11-07T00:00:00Z" and item.origin == "Ministry of Labour"
    assert "deadline 2026-11-20" in item.summary and "Terms of reference" in item.summary and "<p>" not in item.summary


@pytest.mark.parametrize("change", [
    {"procurement_group": "GO"},
    {"procurement_group": "CW"},
    {"notice_type": "Contract Award"},
    {"id": ""},
    {"bid_description": "", "project_name": ""},
])
def test_world_bank_skips_what_cannot_be_work_for_a_lawyer(change):
    assert parse_worldbank({"procnotices": [wb_notice(**change)]}, WB) == []


def test_world_bank_url_filters_by_country_and_date():
    url = build_url(WB)
    assert "project_ctry_name_exact=Azerbaijan" in url and "srt=noticedate" in url and "format=json" in url


def ted_notice(**kw):
    base = {
        "publication-number": "757986-2026", "notice-title": {"eng": ["Sweden – Legal services – Advisory support"], "swe": ["x"]},
        "buyer-name": {"eng": ["RIKSREVISIONEN"]}, "publication-date": "2026-11-02+01:00",
        "place-of-performance": ["AZE", "AZE"], "classification-cpv": ["79100000", "79100000"],
    }
    return {**base, **kw}


def test_ted_notice_becomes_an_item():
    item = parse_ted({"notices": [ted_notice()]}, TED)[0]
    assert item.uid == "757986-2026" and item.title == "Sweden – Legal services – Advisory support"
    assert item.link == "https://ted.europa.eu/en/notice/-/detail/757986-2026"
    assert item.published == "2026-11-02" and item.origin == "RIKSREVISIONEN"
    assert item.summary == "Buyer: RIKSREVISIONEN\nPlace of performance: AZE\nCPV: 79100000"


def test_ted_falls_back_to_the_language_it_has():
    notice = ted_notice(**{"notice-title": {"lit": ["Teisinės paslaugos"]}, "buyer-name": {"lit": ["Agentūra"]}})
    item = parse_ted({"notices": [notice]}, TED)[0]
    assert item.title == "Teisinės paslaugos" and item.origin == "Agentūra"


def test_ted_skips_a_notice_without_number_or_title():
    assert parse_ted({"notices": [ted_notice(**{"publication-number": ""}), ted_notice(**{"notice-title": {}})]}, TED) == []


class FakeResponse:
    status_code = 200

    def __init__(self, data):
        self.data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self.data


class FakeSession:
    def __init__(self, data):
        self.data = data
        self.calls = []

    def request(self, method, url, timeout, **kw):
        self.calls.append((method, url, kw))
        return FakeResponse(self.data)


def test_ted_is_asked_for_recent_notices_only():
    session = FakeSession({"notices": [ted_notice()]})
    items = fetch_source(TED, "ua", session=session)
    method, url, kw = session.calls[0]
    query = kw["json"]["query"]
    assert method == "POST" and url.endswith("/v3/notices/search") and len(items) == 1
    assert query.startswith("(place-of-performance IN (AZE)) AND publication-date >= ") and query.endswith("SORT BY publication-date DESC")


def test_world_bank_is_fetched_with_get():
    session = FakeSession({"procnotices": [wb_notice()]})
    assert len(fetch_source(WB, "ua", session=session)) == 1 and session.calls[0][0] == "GET"


@pytest.mark.parametrize("kind", ["worldbank_notices", "ted_notices"])
def test_query_is_required(kind):
    with pytest.raises(ValueError):
        Source.from_dict({"id": "x", "name": "x", "type": kind, "category": "tender"})


def test_both_portals_are_configured_as_tender_sources_read_by_claude():
    by_id = {s.id: s for s in load_sources(ROOT / "config" / "sources.yaml")}
    for sid in ("worldbank_az", "ted_az"):
        assert by_id[sid].categories == ["tender"] and by_id[sid].ai_screen and by_id[sid].enabled
