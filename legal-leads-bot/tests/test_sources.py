import pytest

from conftest import fixture_bytes, fixture_text
from leadsbot.models import Source
from leadsbot.sources import FetchError, build_url, parse_html_links, parse_reliefweb, parse_rss

import json


def test_build_gnews_url():
    s = Source(id="g", name="g", type="gnews", query='Azerbaijan ("opens office" OR subsidiary)', lang="en")
    url = build_url(s)
    assert url.startswith("https://news.google.com/rss/search?q=")
    assert "%22opens+office%22" in url and "ceid=US%3Aen" in url or "ceid=US:en" in url


def test_parse_gnews_rss(matcher):
    s = Source(id="g", name="g", type="gnews", query="x", category="company", require_geo=True)
    items = parse_rss(fixture_bytes("gnews.xml"), s)
    assert len(items) == 4
    first = items[0]
    assert first.uid == "CBMiAAAA1"
    assert first.origin == "World Oil"
    assert "Vulcan" in first.title and "<" not in first.summary
    results = [matcher.evaluate(i.text, s.category, s.require_geo) for i in items]
    assert results[0] and results[0].category == "company"
    assert results[1] is None  # football → exclude
    assert results[2] is None  # weather, no keyword
    assert results[3] and results[3].category == "company"


def test_parse_reddit_atom(matcher):
    s = Source(id="r", name="r", type="rss", url="https://x", category="individual", require_geo=False)
    items = parse_rss(fixture_bytes("reddit.xml"), s)
    assert len(items) == 2
    assert items[0].uid == "t3_abc123"
    assert items[0].link.endswith("/need_a_lawyer_in_baku/")
    assert "work permit" in items[0].summary
    m = matcher.evaluate(items[0].text, "individual", False)
    assert m and m.category == "individual"
    assert matcher.evaluate(items[1].text, "individual", False) is None


def test_parse_rss_invalid():
    s = Source(id="r", name="r", type="rss", url="https://x")
    with pytest.raises(FetchError):
        parse_rss(b"this is not xml at all <<<", s)


def test_parse_html_links_dedupes_and_filters(matcher):
    s = Source(id="t", name="t", type="html_links", url="https://www.tripadvisor.com/ShowForum-g293933-i9346-Azerbaijan.html",
               link_pattern=r"ShowTopic-g293933-i9346-k\d+", category="individual", require_geo=False)
    items = parse_html_links(fixture_text("forum.html"), s)
    links = [i.link for i in items]
    assert len(items) == 3
    assert all(l.startswith("https://www.tripadvisor.com/ShowTopic-") for l in links)
    assert not any("#" in l for l in links)
    assert items[0].title == "Work permit in Azerbaijan"
    assert "Dec 2025" in items[0].summary
    matched = [i for i in items if matcher.evaluate(i.text, "individual", False)]
    assert [i.title for i in matched] == ["Work permit in Azerbaijan", "Armenia and Azerbaijan - entry ban risk?"]


def test_parse_reliefweb(matcher):
    s = Source(id="rw", name="rw", type="reliefweb_jobs", category="tender", require_geo=False)
    items = parse_reliefweb(json.loads(fixture_text("reliefweb.json")), s)
    assert len(items) == 2
    assert items[0].uid == "reliefweb:4001" and items[0].origin == "UNICEF"
    assert "<p>" not in items[0].summary
    assert matcher.evaluate(items[0].text, "tender", False).category == "tender"
    assert matcher.evaluate(items[1].text, "tender", False) is None


def test_default_sources_config_is_valid(sources):
    assert len(sources) >= 10
    assert {s.type for s in sources} <= {"gnews", "rss", "html_links", "reliefweb_jobs"}
    for s in sources:
        assert build_url(s).startswith("http")


def test_fetch_errors_are_short():
    import requests
    from unittest.mock import MagicMock
    from leadsbot.sources import fetch_source

    s = Source(id="r", name="r", type="rss", url="https://www.reddit.com/r/azerbaijan/new.rss")
    sess = MagicMock()
    sess.request.side_effect = requests.exceptions.ProxyError("Tunnel connection failed: 403 Forbidden " * 20)
    with pytest.raises(FetchError) as ei:
        fetch_source(s, "ua", 5, session=sess)
    assert str(ei.value) == "şəbəkə xətası: ProxyError (reddit.com)"

    resp = MagicMock(status_code=429)
    err = requests.HTTPError(response=resp)
    sess.request.side_effect = None
    sess.request.return_value.status_code = 500
    sess.request.return_value.raise_for_status.side_effect = err
    with pytest.raises(FetchError) as ei:
        fetch_source(s, "ua", 5, session=sess)
    assert str(ei.value) == "HTTP 429 (reddit.com)"


def test_429_is_retried_once_after_waiting(monkeypatch):
    from unittest.mock import MagicMock
    from leadsbot import sources as srcmod

    waits = []
    monkeypatch.setattr(srcmod.time, "sleep", lambda s: waits.append(s))
    limited = MagicMock(status_code=429, headers={"Retry-After": "7"})
    ok = MagicMock(status_code=200, content=fixture_bytes("reddit.xml"))
    sess = MagicMock()
    sess.request.side_effect = [limited, ok]
    s = Source(id="r", name="r", type="rss", url="https://www.reddit.com/search.rss?q=x")
    items = srcmod.fetch_source(s, "ua", 5, session=sess)
    assert len(items) == 2 and sess.request.call_count == 2 and 7 in waits


def test_429_twice_gives_short_error(monkeypatch):
    import requests
    from unittest.mock import MagicMock
    from leadsbot import sources as srcmod

    limited = MagicMock(status_code=429, headers={})
    limited.raise_for_status.side_effect = requests.HTTPError(response=MagicMock(status_code=429))
    sess = MagicMock()
    sess.request.return_value = limited
    s = Source(id="r", name="r", type="rss", url="https://www.reddit.com/search.rss?q=x")
    with pytest.raises(FetchError) as ei:
        srcmod.fetch_source(s, "ua", 5, session=sess)
    assert str(ei.value) == "HTTP 429 (reddit.com)" and sess.request.call_count == 2


def test_reliefweb_uses_v2_and_env_appname(monkeypatch):
    monkeypatch.setenv("RELIEFWEB_APPNAME", "my approved app")
    url = build_url(Source(id="rw", name="rw", type="reliefweb_jobs"))
    assert url == "https://api.reliefweb.int/v2/jobs?appname=my+approved+app"


def test_franchise_headlines_now_match(matcher):
    for title in ("Popeyes opens in Baku with plans for 20 restaurants",
                  "H&M opened its first store in Azerbaijan at Ganjlik Mall"):
        m = matcher.evaluate(title, "company", True)
        assert m and m.category == "company", title


def test_forum_helper_links_are_skipped():
    html = """<ul>
      <li><a href="/en/forum/asia/azerbaijan/1117723-business-setting-up.html">Business setting up and Family residency</a>
          <a href="/en/forum/asia/azerbaijan/1117723-business-setting-up-2.html">Last post 6 years ago by Someone</a>
          <a href="/en/forum/asia/azerbaijan/1117724-x.html">3 replies</a></li>
    </ul>"""
    s = Source(id="e", name="e", type="html_links", url="https://www.expat.com/en/forum/asia/azerbaijan/",
               link_pattern=r"/en/forum/asia/azerbaijan/\d+-", category="individual")
    items = parse_html_links(html, s)
    assert [i.title for i in items] == ["Business setting up and Family residency"]
