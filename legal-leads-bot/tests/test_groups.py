"""Sahib botu Telegram qrupuna əlavə edəndə lidlər o qrupa da gedir; başqası əlavə edəndə getmir."""
from unittest.mock import MagicMock, patch

from leadsbot.bot import LeadsBot
from leadsbot.runner import lead_chats, owner_chats, run_cycle
from leadsbot.storage import Store
from leadsbot.telegram import TelegramClient
from test_ai_screen import FORUM, PLAIN, ScoringAI, posts, seeded
from test_bot import FakeTG2, _seed_lead
from test_manual import POST
from test_runner import FakeTG

OWNER, STRANGER, BOT = 42, 777, 123  # conftest: bot_token="123:TEST", allowed_chat_ids=["42"]
GROUP = {"id": -100500, "type": "supergroup", "title": "Hüquq komandası"}


def added(by, status="member", chat=GROUP):
    return {"update_id": 1, "my_chat_member": {"chat": chat, "from": {"id": by},
                                               "new_chat_member": {"status": status, "user": {"id": BOT}}}}


def said(text, by=OWNER, chat=GROUP):
    return {"update_id": 2, "message": {"chat": chat, "from": {"id": by}, "text": text}}


def pressed(data, by):
    return {"update_id": 3, "callback_query": {"id": "q", "data": data, "from": {"id": by},
                                               "message": {"message_id": 9, "chat": GROUP}}}


def new_bot(settings, tg=None):
    store = Store(settings.db_path)
    return LeadsBot(settings, store, tg or FakeTG2()), store


def test_owner_adds_bot_and_leads_go_to_the_group_too(settings, matcher):
    bot, store = new_bot(settings)
    bot.handle(added(OWNER))
    assert store.groups() == {"-100500": "Hüquq komandası"}
    assert bot.tg.sent[0][0] == "-100500" and "qoşuldu" in bot.tg.sent[0][1]
    assert bot.tg.sent[1][0] == "42" and "Hüquq komandası" in bot.tg.sent[1][1] and "/stop" in bot.tg.sent[1][1]
    assert bot.active_chats() == ["42", "-100500"]

    from leadsbot.manual import add_manual_leads
    add_manual_leads(store, "linkedin", [POST])
    tg = FakeTG()
    run_cycle(settings, store, [], matcher, tg, bot.active_chats(), ai=ScoringAI(value=9))
    assert sorted(c for c, _, _ in tg.sent) == ["-100500", "42"]


def test_the_same_join_reported_twice_greets_once(settings):
    bot, store = new_bot(settings)
    bot.handle(added(OWNER))
    bot.handle({"update_id": 4, "message": {"chat": GROUP, "from": {"id": OWNER},
                                            "new_chat_members": [{"id": BOT, "is_bot": True}]}})
    assert len([m for c, m in bot.tg.sent if c == "-100500"]) == 1


def test_creating_a_group_with_the_bot_joins_it(settings):
    bot, store = new_bot(settings)
    chat = {"id": -7, "type": "group", "title": "Yeni qrup"}
    bot.handle({"update_id": 4, "message": {"chat": chat, "from": {"id": OWNER}, "group_chat_created": True}})
    assert "-7" in store.groups()


def test_stranger_adding_the_bot_gets_nothing(settings):
    bot, store = new_bot(settings)
    bot.handle(added(STRANGER))
    assert store.groups() == {} and bot.tg.sent == []
    assert lead_chats(settings, store) == ["42"]


def test_removing_the_bot_stops_leads_and_tells_the_owner(settings):
    bot, store = new_bot(settings)
    bot.handle(added(OWNER))
    bot.handle(added(STRANGER, status="kicked"))
    assert store.groups() == {} and bot.active_chats() == ["42"]
    assert bot.tg.sent[-1][0] == "42" and "çıxarıldı" in bot.tg.sent[-1][1]
    bot.handle({"update_id": 5, "message": {"chat": GROUP, "from": {"id": OWNER}, "left_chat_member": {"id": BOT}}})
    assert len([m for _, m in bot.tg.sent if "çıxarıldı" in m]) == 1


def test_promoting_the_bot_in_a_joined_group_changes_nothing(settings):
    bot, store = new_bot(settings)
    bot.handle(added(OWNER))
    before = len(bot.tg.sent)
    bot.handle(added(STRANGER, status="administrator"))
    assert len(bot.tg.sent) == before and "-100500" in store.groups()


def test_in_a_group_only_the_owner_gives_commands(settings):
    bot, store = new_bot(settings)
    bot.handle(said("/ping"))
    assert "/join" in bot.tg.sent[-1][1] and store.groups() == {}  # qoşulmamış qrup
    bot.handle(said("/join@legal_leads_bot", by=STRANGER))
    assert store.groups() == {} and len(bot.tg.sent) == 1  # başqasına cavab yoxdur
    bot.handle(said("/join@legal_leads_bot"))
    assert "-100500" in store.groups()
    bot.handle(said("/join"))
    assert "artıq qoşulub" in bot.tg.sent[-1][1]
    n = len(bot.tg.sent)
    bot.handle(said("/update", by=STRANGER))
    assert len(bot.tg.sent) == n
    bot.handle(said("/ping"))
    assert bot.tg.sent[-1][0] == "-100500" and "İşləyirəm" in bot.tg.sent[-1][1]
    bot.handle(said("/stop"))
    assert bot.active_chats() == ["42"]


def test_group_buttons_work_only_for_the_owner(settings):
    bot, store = new_bot(settings)
    bot.handle(added(OWNER))
    lead = _seed_lead(store)
    bot.handle(pressed(f"s:{lead}:i", STRANGER))
    assert store.get_item(lead)["status"] == "new" and "sahibi" in bot.tg.answers[-1]
    bot.handle(pressed(f"s:{lead}:i", OWNER))
    assert store.get_item(lead)["status"] == "interested"


def test_group_upgraded_to_supergroup_keeps_getting_leads(settings):
    bot, store = new_bot(settings)
    small = {"id": -55, "type": "group", "title": "Kiçik qrup"}
    bot.handle(added(OWNER, chat=small))
    bot.handle(said("/stop", chat=small))
    bot.handle({"update_id": 6, "message": {"chat": small, "from": {"id": OWNER}, "migrate_to_chat_id": -100900}})
    bot.handle({"update_id": 7, "message": {"chat": {"id": -100900, "type": "supergroup", "title": "Kiçik qrup"},
                                            "from": {"id": OWNER}, "migrate_from_chat_id": -55}})
    assert store.groups() == {"-100900": "Kiçik qrup"}
    assert store.get("muted:-100900") == "1" and store.get("muted:-55") is None


def test_groups_command_lists_them(settings):
    bot, store = new_bot(settings)
    bot.handle({"update_id": 1, "message": {"chat": {"id": OWNER, "type": "private"}, "text": "/groups"}})
    assert "Hələ heç bir qrup yoxdur" in bot.tg.sent[-1][1]
    bot.handle(added(OWNER))
    bot.handle({"update_id": 1, "message": {"chat": {"id": OWNER, "type": "private"}, "text": "/groups"}})
    assert "Hüquq komandası" in bot.tg.sent[-1][1]


def test_private_strangers_are_still_told_the_bot_is_private(settings):
    bot, _ = new_bot(settings)
    bot.handle(said("/stats", by=STRANGER, chat={"id": STRANGER, "type": "private"}))
    assert bot.tg.sent[-1][0] == "777" and "şəxsidir" in bot.tg.sent[-1][1]


def test_technical_alerts_go_to_the_owner_not_the_group(settings, matcher):
    store = seeded(settings, matcher)
    store.add_group("-100500", "Hüquq komandası")
    tg = FakeTG()
    for i in range(4):
        with patch("leadsbot.runner.fetch_source", posts(f"{PLAIN} {i}")):
            run_cycle(settings, store, [FORUM], matcher, tg, lead_chats(settings, store),
                      ai=ScoringAI(fail=True), alert_chats=owner_chats(settings, store))
    alerts = [c for c, m, _ in tg.sent if "ardıcıl işləmədi" in m]
    assert alerts == ["42"]


def test_bot_asks_telegram_for_join_and_leave_events():
    sess = MagicMock()
    sess.post.return_value.json.return_value = {"ok": True, "result": []}
    TelegramClient("1:x", session=sess).get_updates(None, timeout=0)
    assert "my_chat_member" in sess.post.call_args.kwargs["json"]["allowed_updates"]
