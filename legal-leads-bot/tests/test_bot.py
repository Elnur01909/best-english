from unittest.mock import patch

from leadsbot.bot import LeadsBot
from leadsbot.storage import Store


class FakeTG:
    def __init__(self):
        self.sent = []

    def send_message(self, chat_id, text, **kw):
        self.sent.append((str(chat_id), text))


def upd(chat_id, text, uid=1):
    return {"update_id": uid, "message": {"chat": {"id": chat_id}, "text": text}}


def test_unauthorized_chat_is_rejected(settings):
    bot = LeadsBot(settings, Store(settings.db_path), FakeTG())
    bot.handle(upd(999, "/stats"))
    assert bot.tg.sent[0][0] == "999" and "şəxsidir" in bot.tg.sent[0][1]


def test_keyword_commands(settings):
    store = Store(settings.db_path)
    bot = LeadsBot(settings, store, FakeTG())
    bot.handle(upd(42, "/addkw golden visa"))
    assert store.user_keywords() == ["golden visa"]
    assert bot.matcher().evaluate("Azerbaijan golden visa", "company", True)
    bot.handle(upd(42, "/delkw golden visa"))
    assert store.user_keywords() == []


def test_mute_unmute_and_sources_listing(settings):
    store = Store(settings.db_path)
    bot = LeadsBot(settings, store, FakeTG())
    bot.handle(upd(42, "/mute gnews_office"))
    assert store.source_enabled("gnews_office", True) is False
    bot.handle(upd(42, "/unmute gnews_office"))
    assert store.source_enabled("gnews_office", False) is True
    bot.handle(upd(42, "/mute nope"))
    assert "Mənbə id-si lazımdır" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/sources"))
    assert "gnews_office" in bot.tg.sent[-1][1]


def test_stop_and_start_toggle_notifications(settings):
    store = Store(settings.db_path)
    bot = LeadsBot(settings, store, FakeTG())
    bot.handle(upd(42, "/stop"))
    assert bot.active_chats() == []
    bot.handle(upd(42, "/start"))
    assert bot.active_chats() == ["42"]


def test_unknown_and_help(settings):
    bot = LeadsBot(settings, Store(settings.db_path), FakeTG())
    bot.handle(upd(42, "/whatever"))
    assert "Naməlum əmr" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/help@mybot"))
    assert "/run" in bot.tg.sent[-1][1]


def test_telegram_errors_never_contain_token():
    import requests
    from unittest.mock import MagicMock

    import pytest

    from leadsbot.telegram import TelegramClient, TelegramError

    token = "123456:SECRET_TOKEN_VALUE"
    sess = MagicMock()
    sess.post.side_effect = requests.exceptions.ProxyError(f"https://api.telegram.org/bot{token}/getMe failed")
    client = TelegramClient(token, session=sess)
    with pytest.raises(TelegramError) as ei:
        client.get_me()
    assert "SECRET_TOKEN_VALUE" not in str(ei.value)
    assert ei.value.__cause__ is None and ei.value.__suppress_context__


# ── Mərhələ 3: düymələr, kartlar, iş axını ──

class FakeTG2(FakeTG):
    def __init__(self):
        super().__init__()
        self.answers, self.edits, self.kw = [], [], []

    def send_message(self, chat_id, text, **kw):
        self.sent.append((str(chat_id), text))
        self.kw.append(kw)

    def answer_callback(self, cq_id, text=""):
        self.answers.append(text)

    def edit_reply_markup(self, chat_id, message_id, markup):
        self.edits.append(markup)


def _seed_lead(store, title="Acme opens office in Baku"):
    from leadsbot.models import Item, MatchResult
    store.add_item(Item("gnews_office", "u-" + title, title, "https://x", "summary"), MatchResult("company", 3, ["new office"]))
    return store.recent_matches(1)[0]["id"]


def cb(chat_id, data, msg_id=10):
    return {"update_id": 5, "callback_query": {"id": "cq1", "data": data,
                                                "message": {"message_id": msg_id, "chat": {"id": chat_id}}}}


def test_status_buttons_toggle_and_pipeline(settings):
    store = Store(settings.db_path)
    lead = _seed_lead(store)
    bot = LeadsBot(settings, store, FakeTG2())
    bot.handle(cb(42, f"s:{lead}:i"))
    assert store.get_item(lead)["status"] == "interested"
    assert "Maraqlıdır" in bot.tg.answers[-1]
    pressed = [b["text"] for row in bot.tg.edits[-1]["inline_keyboard"] for b in row]
    assert pressed[0].startswith("✅")
    bot.handle(cb(42, f"s:{lead}:i"))  # ikinci basış sıfırlayır
    assert store.get_item(lead)["status"] == "new"
    bot.handle(cb(42, f"s:{lead}:c"))
    bot.handle(upd(42, "/pipeline"))
    assert f"/l{lead}" in bot.tg.sent[-1][1] and "Əlaqə saxlanılıb — 1" in bot.tg.sent[-1][1]


def test_callback_from_stranger_is_ignored(settings):
    store = Store(settings.db_path)
    lead = _seed_lead(store)
    bot = LeadsBot(settings, store, FakeTG2())
    bot.handle(cb(999, f"s:{lead}:x"))
    assert store.get_item(lead)["status"] == "new" and bot.tg.answers == ["İcazə yoxdur"]


def test_draft_button_uses_template_without_ai(settings):
    store = Store(settings.db_path)
    lead = _seed_lead(store)
    bot = LeadsBot(settings, store, FakeTG2())
    bot.handle(cb(42, f"s:{lead}:d"))
    text = bot.tg.sent[-1][1]
    assert "Məktub layihəsi" in text and "şablon" in text and "<pre>" in text
    assert bot.tg.kw[-1]["reply_to"] == 10


def test_draft_uses_ai_when_available(settings):
    class AI:
        def draft(self, lead):
            return "Hello from Claude about " + lead["title"]
    store = Store(settings.db_path)
    lead = _seed_lead(store)
    bot = LeadsBot(settings, store, FakeTG2(), ai=AI())
    bot.handle(upd(42, f"/draft {lead}"))
    assert "Hello from Claude about Acme" in bot.tg.sent[-1][1] and "Claude" in bot.tg.sent[-1][1]


def test_lead_card_command(settings):
    store = Store(settings.db_path)
    lead = _seed_lead(store)
    bot = LeadsBot(settings, store, FakeTG2())
    bot.handle(upd(42, f"/l{lead}"))
    assert "Acme opens office" in bot.tg.sent[-1][1]
    assert bot.tg.kw[-1]["reply_markup"]["inline_keyboard"]
    bot.handle(upd(42, "/l99999"))
    assert "tapılmadı" in bot.tg.sent[-1][1]


def test_addtg_and_deltg(settings):
    from leadsbot.models import Item
    store = Store(settings.db_path)
    bot = LeadsBot(settings, store, FakeTG2())
    posts = [Item("tg_hellojob_az", "tg:hellojob_az/1", "Senior Lawyer", "https://t.me/hellojob_az/1",
                  "Senior Lawyer, Baku", origin="HelloJob")]
    with patch("leadsbot.bot.fetch_source", lambda *a, **k: posts):
        bot.handle(upd(42, "/addtg https://t.me/hellojob_az"))
    assert "Əlavə edildi" in bot.tg.sent[-1][1] and "1 uyğun" in bot.tg.sent[-1][1]
    assert "tg_hellojob_az" in {s.id for s in bot.sources}
    with patch("leadsbot.bot.fetch_source", lambda *a, **k: []):
        bot.handle(upd(42, "/addtg @empty_channel"))
    assert "açıq post görünmür" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/addtg @hellojob_az wrongcat"))
    assert "İstifadə" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/deltg @hellojob_az"))
    assert "tg_hellojob_az" not in {s.id for s in bot.sources}


def test_digest_and_minscore_commands(settings):
    store = Store(settings.db_path)
    bot = LeadsBot(settings, store, FakeTG2())
    bot.handle(upd(42, "/digest 8:30"))
    assert "08:30" in bot.tg.sent[-1][1] and store.get("digest_time") == "08:30"
    bot.handle(upd(42, "/digest off"))
    assert "söndürülüb" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/digest 25:00"))
    assert "İstifadə" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/digest now"))
    assert "Səhər xülasəsi" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/minscore 7"))
    assert "7/10" in bot.tg.sent[-1][1] and store.get("ai_min_score") == "7"
    bot.handle(upd(42, "/minscore 11"))
    assert "İstifadə" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/ai"))
    assert "ANTHROPIC_API_KEY" in bot.tg.sent[-1][1]


class PollTG(FakeTG):
    def __init__(self, batches):
        super().__init__()
        self.batches = list(batches)

    def get_updates(self, offset=None, timeout=30):
        return self.batches.pop(0) if self.batches else []


def test_commands_are_answered_during_a_long_cycle(settings):
    from leadsbot.models import Source

    tg = PollTG([[upd(42, "/ping", uid=5)], [upd(42, "/run", uid=6)]])
    bot = LeadsBot(settings, Store(settings.db_path), tg)
    bot.config_sources = [Source(id=i, name=i, type="rss", url="https://x") for i in ("a", "b")]
    with patch("leadsbot.runner.fetch_source", lambda *a, **k: []):
        bot.cycle(announce=False)
    texts = [t for _, t in tg.sent]
    assert any("İşləyirəm" in t for t in texts) and any("hazırda yoxlanır" in t for t in texts)
    assert bot.offset == 7 and bot.cycling is False


def test_addrss_and_delrss(settings):
    store = Store(settings.db_path)
    bot = LeadsBot(settings, store, FakeTG())
    with patch("leadsbot.bot.fetch_source", lambda *a, **k: []):
        bot.handle(upd(42, "/addrss https://www.google.com/alerts/feeds/123/456 individual"))
    added = [s for s in bot.sources if s.user_added]
    assert len(added) == 1 and added[0].type == "rss" and added[0].url.endswith("/456")
    assert added[0].name == "Google Alerts" and added[0].categories == ["individual"] and added[0].expect_empty
    bot.handle(upd(42, f"/delrss {added[0].id}"))
    assert [s for s in bot.sources if s.user_added] == []
    bot.handle(upd(42, "/addrss not-a-link"))
    assert "İstifadə" in bot.tg.sent[-1][1]


def test_old_database_gets_the_url_column(tmp_path):
    import sqlite3

    path = tmp_path / "old.sqlite"
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE user_sources (id TEXT PRIMARY KEY, type TEXT NOT NULL, channel TEXT, name TEXT, "
                 "category TEXT, added_at TEXT NOT NULL)")
    conn.execute("INSERT INTO user_sources VALUES ('tg_x', 'tg_channel', 'kanal_x', 'X', 'job', '2026-01-01')")
    conn.commit()
    conn.close()
    assert [s.channel for s in Store(path).user_sources()] == ["kanal_x"]


def test_health_link_is_saved_and_pinged_after_a_full_cycle(settings):
    from unittest.mock import MagicMock

    bot = LeadsBot(settings, Store(settings.db_path), FakeTG())
    with patch("leadsbot.bot.requests.get", MagicMock()) as get:
        bot.handle(upd(42, "/health https://hc-ping.com/abc"))
        assert get.call_count == 1 and "yadda saxlandı" in bot.tg.sent[-1][1]
        bot.config_sources = []
        bot.cycle(announce=False)
        assert get.call_count == 2
        bot.handle(upd(42, "/health off"))
        bot.cycle(announce=False)
        assert get.call_count == 2


def test_types_command(settings):
    from leadsbot.config import DEFAULT_LEAD_TYPES

    settings.lead_types = DEFAULT_LEAD_TYPES
    store = Store(settings.db_path)
    bot = LeadsBot(settings, store, FakeTG())
    bot.handle(upd(42, "/types"))
    assert "Fərdi sorğu" in bot.tg.sent[-1][1] and "Şirkət lidi" not in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/types individual, company"))
    assert store.get("lead_types") == "individual,company" and "Şirkət lidi" in bot.tg.sent[-1][1]
    bot.handle(upd(42, "/types nonsense"))
    assert "İstifadə" in bot.tg.sent[-1][1] and store.get("lead_types") == "individual,company"
