from leadsbot.setup_wizard import run_setup, set_env_value
from leadsbot.telegram import TelegramError


def test_set_env_value_updates_and_appends(tmp_path):
    env = tmp_path / ".env"
    env.write_text("# comment\nTELEGRAM_BOT_TOKEN=\nFETCH_INTERVAL_MIN=30\n", encoding="utf-8")
    set_env_value(env, "TELEGRAM_BOT_TOKEN", "1:abc")
    set_env_value(env, "TELEGRAM_CHAT_ID", "42")
    text = env.read_text(encoding="utf-8")
    assert "TELEGRAM_BOT_TOKEN=1:abc" in text and "TELEGRAM_CHAT_ID=42" in text
    assert "# comment" in text and "FETCH_INTERVAL_MIN=30" in text
    assert text.count("TELEGRAM_BOT_TOKEN=") == 1


class FakeClient:
    def __init__(self, token, good_tokens=("1:good",), updates=None):
        self.token = token
        self.good = good_tokens
        self.updates = list(updates or [])
        self.sent = []
        self.offsets = []

    def get_me(self):
        if self.token not in self.good:
            raise TelegramError("Unauthorized")
        return {"username": "my_leads_bot"}

    def get_updates(self, offset=None, timeout=30):
        self.offsets.append(offset)
        if self.updates:
            return [self.updates.pop(0)]
        return []

    def send_message(self, chat_id, text, **kw):
        self.sent.append((chat_id, text))


def test_full_setup_flow(tmp_path):
    (tmp_path / ".env.example").write_text("TELEGRAM_BOT_TOKEN=\nTELEGRAM_CHAT_ID=\n", encoding="utf-8")
    env = tmp_path / ".env"
    answers = iter(["not-a-token", "1:bad", "1:good"])
    clients = []
    start = {"update_id": 7, "message": {"chat": {"id": 555}, "text": "/start"}}

    def make(token):
        c = FakeClient(token, updates=[{"update_id": 6, "message": {"chat": {"id": 1}, "text": "hi"}}, start])
        clients.append(c)
        return c

    out = []
    rc = run_setup(env, ask=lambda _: next(answers), out=out.append, make_client=make, wait_seconds=60, ask_ai=False)
    assert rc == 0
    text = env.read_text(encoding="utf-8")
    assert "TELEGRAM_BOT_TOKEN=1:good" in text and "TELEGRAM_CHAT_ID=555" in text
    good = clients[-1]
    assert good.sent and good.sent[0][0] == "555"
    assert good.offsets[-1] == 8  # /start acknowledged so serve won't replay it
    assert any("Token işləmədi" in line for line in out)
    assert any("token kimi görünmür" in line for line in out)


def test_existing_config_only_sends_test(tmp_path):
    env = tmp_path / ".env"
    env.write_text("TELEGRAM_BOT_TOKEN=1:good\nTELEGRAM_CHAT_ID=42\n", encoding="utf-8")
    made = []

    def make(token):
        c = FakeClient(token)
        made.append(c)
        return c

    rc = run_setup(env, "1:good", ["42"], ask=lambda _: (_ for _ in ()).throw(AssertionError("should not ask")),
                   out=lambda _: None, make_client=make, existing_ai_key="sk-ant-x")
    assert rc == 0 and made[0].sent[0][0] == "42"


def test_no_start_times_out(tmp_path):
    env = tmp_path / ".env"
    rc = run_setup(env, ask=lambda _: "1:good", out=lambda _: None,
                   make_client=lambda t: FakeClient(t), wait_seconds=0, ask_ai=False)
    assert rc == 1
    assert "TELEGRAM_BOT_TOKEN=1:good" in env.read_text(encoding="utf-8")


def test_claude_key_is_validated_and_saved(tmp_path):
    env = tmp_path / ".env"
    env.write_text("TELEGRAM_BOT_TOKEN=1:good\nTELEGRAM_CHAT_ID=42\n", encoding="utf-8")
    answers = iter(["sk-bad", "sk-ant-good"])
    out = []
    rc = run_setup(env, "1:good", ["42"], ask=lambda _: next(answers), out=out.append,
                   make_client=lambda t: FakeClient(t),
                   validate_ai=lambda k: None if k == "sk-ant-good" else "açar yanlışdır")
    assert rc == 0
    assert "ANTHROPIC_API_KEY=sk-ant-good" in env.read_text(encoding="utf-8")
    assert any("açar yanlışdır" in line for line in out)


def test_claude_key_can_be_skipped(tmp_path):
    env = tmp_path / ".env"
    env.write_text("TELEGRAM_BOT_TOKEN=1:good\nTELEGRAM_CHAT_ID=42\n", encoding="utf-8")
    rc = run_setup(env, "1:good", ["42"], ask=lambda _: "", out=lambda _: None,
                   make_client=lambda t: FakeClient(t), validate_ai=lambda k: "should not validate")
    assert rc == 0 and "ANTHROPIC_API_KEY" not in env.read_text(encoding="utf-8")
