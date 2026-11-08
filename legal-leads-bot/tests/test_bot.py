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
