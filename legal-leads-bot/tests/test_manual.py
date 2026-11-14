"""LinkedIn-də Claude-un tapdığı müraciət botun növbəsinə düşür və adi lid kimi Telegram-a gedir."""
import json

from leadsbot import __main__ as entry
from leadsbot.manual import MANUAL_SOURCES, add_manual_leads, lead_uid, load_leads_file
from leadsbot.storage import Store
from test_ai_screen import ScoringAI
from test_runner import FakeTG, run

POST = {"link": "https://www.linkedin.com/feed/update/urn:li:activity:7390000000000000001/",
        "title": "Looking for a Lawyer in Baku, Azerbaijan",
        "text": "Business registration, foreign investment and TRC.", "who": "CEO, Dreamways"}


def test_same_post_with_tracking_bits_is_one_lead():
    a = lead_uid("https://www.linkedin.com/feed/update/urn:li:activity:1/?utm_source=share#comments")
    assert a == lead_uid("https://linkedin.com/feed/update/urn:li:activity:1")


def test_lead_is_queued_once(settings):
    store = Store(settings.db_path)
    assert add_manual_leads(store, "linkedin", [POST]) == [("pending", POST["title"])]
    assert add_manual_leads(store, "linkedin", [dict(POST, link=POST["link"] + "?x=1")])[0][0] == "known"
    row = store.pending(10)[0]
    assert row["hits"] == "linkedin" and row["category"] == "individual" and "Dreamways" in row["summary"]


def test_bad_input_is_refused(settings):
    store = Store(settings.db_path)
    out = add_manual_leads(store, "linkedin", [{"link": "linkedin.com/x", "title": "T"}, {"link": "https://x"}])
    assert [o for o, _ in out] == ["invalid", "invalid"]
    assert store.pending_count() == 0


def test_lead_reaches_telegram_scored_and_named(settings, matcher):
    store = Store(settings.db_path)
    add_manual_leads(store, "linkedin", [POST])
    tg = FakeTG()
    run(settings, store, [], matcher, tg, ai=ScoringAI(value=9))
    assert len(tg.sent) == 1
    text = tg.sent[0][1]
    assert "LinkedIn" in text and "9/10" in text and POST["link"] in text


def test_lead_is_sent_even_when_claude_is_down(settings, matcher):
    store = Store(settings.db_path)
    add_manual_leads(store, "linkedin", [POST])
    tg = FakeTG()
    run(settings, store, [], matcher, tg, ai=ScoringAI(fail=True))
    assert len(tg.sent) == 1


def test_file_and_command(settings, tmp_path, monkeypatch, capsys):
    f = tmp_path / "leads.json"
    f.write_text(json.dumps([POST, {"link": "https://www.linkedin.com/posts/b", "title": "Need help with LLC"}]),
                 encoding="utf-8")
    assert len(load_leads_file(f)) == 2
    monkeypatch.setattr(entry, "load_settings", lambda env=None: settings)
    assert entry.main(["add", "--file", str(f)]) == 0
    assert entry.main(["add", "--link", POST["link"], "--title", POST["title"]]) == 0
    out = capsys.readouterr().out
    assert out.count("növbəyə qoyuldu") == 2 and "artıq var" in out
    assert entry.main(["add", "--source", "facebook", "--link", "https://x", "--title", "T"]) == 2
    assert "linkedin" in MANUAL_SOURCES
