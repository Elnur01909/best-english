"""İzləmə siyahısı: gündəlik internet araşdırması çox elanlı səhifələrdən yalnız yeni elanları görür."""
from unittest.mock import patch

from conftest import ROOT
from leadsbot import __main__ as entry
from leadsbot.models import Item, Source
from leadsbot.sources import FetchError
from leadsbot.storage import Store
from leadsbot.watch import read_page, render_watch, watch_pages

WATCHLIST = ROOT / "config" / "watchlist.yaml"
PAGE = Source(id="uni_jobs", name="Universitet vakansiyaları", type="html_links", url="https://jobs.example.org/law/",
              link_pattern="/job/\\d+", category="job")
OTHER = Source(id="calls", name="Ekspert çağırışları", type="rss", url="https://calls.example.org/feed", category="tender")


def job(n, title):
    return Item("uni_jobs", f"u{n}", title, f"https://jobs.example.org/job/{n}", f"{title} Remote, part-time", "", "example.org")


def fetch(*lists):
    """Hər çağırışda növbəti siyahını qaytarır; siyahı əvəzinə xəta da ola bilər."""
    queue = list(lists)

    def _fetch(src, *a, **k):
        res = queue.pop(0)
        if isinstance(res, Exception):
            raise res
        return res
    return _fetch


def test_each_notice_is_shown_once(settings):
    store = Store(settings.db_path)
    first = [job(1, "View details Adjunct Lecturer in International Law"), job(2, "Human Rights Trainer")]
    with patch("leadsbot.watch.fetch_source", fetch(first, first + [job(3, "Legal English Tutor")])):
        one = render_watch(store, [PAGE], "ua", 5)
        two = render_watch(store, [PAGE], "ua", 5)
    assert "2 yeni / 2" in one and "https://jobs.example.org/job/1" in one
    assert "1. Adjunct Lecturer in International Law" in one  # düymənin yazısı başlıqdan silinir
    assert "Remote, part-time" in one
    assert "1 yeni / 3" in two and "Legal English Tutor" in two and "Human Rights Trainer" not in two


def test_peek_shows_without_remembering_and_never_reaches_telegram(settings):
    store = Store(settings.db_path)
    items = [job(1, "Adjunct Lecturer in International Law")]
    with patch("leadsbot.watch.fetch_source", fetch(items, items, items)):
        assert "1 yeni" in render_watch(store, [PAGE], "ua", 5, mark=False)
        assert "1 yeni" in render_watch(store, [PAGE], "ua", 5)
        assert "0 yeni" in render_watch(store, [PAGE], "ua", 5)
    assert store.pending_count() == 0  # izləmə elanları bota lid kimi düşmür


def test_a_broken_page_does_not_stop_the_rest(settings):
    store = Store(settings.db_path)
    with patch("leadsbot.watch.fetch_source", fetch(FetchError("HTTP 403 (example.org)"), [job(5, "Call for experts")])):
        out = render_watch(store, [PAGE, OTHER], "ua", 5)
    assert "uni_jobs — OXUNMADI: HTTP 403" in out and "Call for experts" in out


def test_long_pages_are_cut_and_say_so(settings):
    store = Store(settings.db_path)
    with patch("leadsbot.watch.fetch_source", fetch([job(n, f"Lecturer post number {n}") for n in range(8)])):
        out = render_watch(store, [PAGE], "ua", 5, limit=3)
    assert "3. Lecturer post number 2" in out and "4. " not in out and "daha 5 yeni elan" in out


def test_watchlist_file_is_valid_and_grouped():
    pages = watch_pages(WATCHLIST)
    assert len(pages) >= 8 and {p.category for p in pages} == {"job", "tender", "individual"}
    assert all(p.type in ("rss", "html_links") for p in pages)
    assert {p.id for p in watch_pages(WATCHLIST, group="tender")} >= {"osce_vacancies"}
    assert [p.id for p in watch_pages(WATCHLIST, only={"esil_feed"})] == ["esil_feed"]


def test_watch_and_page_commands(settings, monkeypatch, capsys):
    monkeypatch.setattr(entry, "load_settings", lambda env=None: settings)
    assert entry.main(["watch", "--list", "--group", "job"]) == 0
    assert "jobs_ac_uk_intlaw" in capsys.readouterr().out
    with patch("leadsbot.watch.fetch_source", fetch([job(1, "Adjunct Lecturer")])):
        assert entry.main(["watch", "--only", "esil_feed"]) == 0
    assert "Adjunct Lecturer" in capsys.readouterr().out
    assert entry.main(["watch", "--only", "no_such_page"]) == 2

    class Resp:
        url = "https://jobs.example.org/job/1"
        encoding = "utf-8"
        text = ("<html><head><title>Adjunct Lecturer</title></head><body><nav>Menu</nav><main><h1>Adjunct Lecturer</h1>"
                "<p>Teach   international law online.</p><script>x()</script></main><footer>Cookies</footer></body></html>")

    with patch("leadsbot.watch._request", lambda *a, **k: Resp()):
        text = read_page("https://jobs.example.org/job/1", "ua")
        assert entry.main(["page", "https://jobs.example.org/job/1"]) == 0
    assert "Teach international law online." in text and "Menu" not in text and "Cookies" not in text and "x()" not in text
    assert "Teach international law online." in capsys.readouterr().out
