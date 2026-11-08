"""İnteraktiv quraşdırma: token → yoxlama → /start gözləmə → çat ID → test mesajı.
`python -m leadsbot setup` və ya Windows-da setup.bat ilə işə düşür."""
from __future__ import annotations

import shutil
import time
from pathlib import Path
from typing import Callable

from .telegram import TelegramClient, TelegramError

WAIT_SECONDS = 180


def set_env_value(path: Path, key: str, value: str) -> None:
    """`.env` faylında KEY=... sətrini yeniləyir, yoxdursa əlavə edir. Digər sətirlərə toxunmur."""
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    new_line = f"{key}={value}"
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = new_line
            break
    else:
        lines.append(new_line)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def ensure_env_file(env_path: Path) -> None:
    if env_path.exists():
        return
    example = env_path.parent / ".env.example"
    if example.exists():
        shutil.copyfile(example, env_path)
    else:
        env_path.write_text("", encoding="utf-8")


def _ask_token(ask: Callable[[str], str], make_client: Callable[[str], TelegramClient], out) -> tuple[str, TelegramClient, dict]:
    while True:
        token = ask("BotFather-dən aldığınız tokeni yapışdırın və Enter basın: ").strip().strip('"').strip("'")
        if not token:
            continue
        if ":" not in token:
            out("Bu token kimi görünmür (formatı: 123456789:AAH...). Yenidən cəhd edin.")
            continue
        client = make_client(token)
        try:
            me = client.get_me()
            return token, client, me
        except TelegramError as exc:
            out(f"Token işləmədi: {exc}. Yenidən cəhd edin.")


def _wait_for_start(client: TelegramClient, username: str, out, wait_seconds: int, clock=time.monotonic) -> str | None:
    out("")
    out(f"İndi Telegram-da botunuzu açın: https://t.me/{username}")
    out(f"və /start yazın. Gözləyirəm (ən çox {wait_seconds // 60} dəqiqə)...")
    deadline = clock() + wait_seconds
    offset = None
    while clock() < deadline:
        try:
            updates = client.get_updates(offset, timeout=min(20, max(1, int(deadline - clock()))))
        except TelegramError as exc:
            out(f"Telegram xətası: {exc}")
            return None
        for upd in updates:
            offset = upd["update_id"] + 1
            msg = upd.get("message") or {}
            text = (msg.get("text") or "").strip().lower()
            chat_id = (msg.get("chat") or {}).get("id")
            if chat_id is not None and text.startswith("/start"):
                try:  # /start-ı "oxunmuş" et ki, serve rejimi onu təkrar emal etməsin
                    client.get_updates(offset, timeout=0)
                except TelegramError:
                    pass
                return str(chat_id)
    return None


def run_setup(
    env_path: Path,
    existing_token: str = "",
    existing_chats: list[str] | None = None,
    ask: Callable[[str], str] = input,
    out: Callable[[str], None] = print,
    make_client: Callable[[str], TelegramClient] = lambda t: TelegramClient(t),
    wait_seconds: int = WAIT_SECONDS,
    force: bool = False,
) -> int:
    ensure_env_file(env_path)
    out("=== Legal Leads Bot — quraşdırma ===")

    client = None
    me: dict = {}
    token = existing_token
    if token and not force:
        client = make_client(token)
        try:
            me = client.get_me()
            out(f"Mövcud token işləyir: @{me.get('username')}")
        except TelegramError as exc:
            out(f".env-dəki token işləmədi ({exc}). Yenisini daxil edin.")
            client = None
    if client is None:
        out("1) Telegram-da @BotFather → /newbot → ad və 'bot' ilə bitən istifadəçi adı verin.")
        token, client, me = _ask_token(ask, make_client, out)
        set_env_value(env_path, "TELEGRAM_BOT_TOKEN", token)
        out(f"Token saxlanıldı. Bot: @{me.get('username')}")

    chats = list(existing_chats or [])
    if chats and not force:
        out(f"Mövcud çat ID: {', '.join(chats)}")
    else:
        chat_id = _wait_for_start(client, me.get("username", ""), out, wait_seconds)
        if not chat_id:
            out("/start mesajı gəlmədi. Bota /start yazıb quraşdırmanı yenidən işə salın.")
            return 1
        set_env_value(env_path, "TELEGRAM_CHAT_ID", chat_id)
        chats = [chat_id]
        out(f"Çat ID tapıldı və saxlanıldı: {chat_id}")

    try:
        for chat in chats:
            client.send_message(
                chat,
                "✅ <b>Legal Leads Bot qoşuldu.</b>\nBotu işə salmaq üçün start.bat (və ya "
                "<code>python -m leadsbot serve</code>). Əmrlər üçün /help.",
            )
    except TelegramError as exc:
        out(f"Test mesajı göndərilmədi: {exc}")
        return 1
    out("")
    out("Hazırdır! Telegram-a test mesajı göndərildi.")
    out("Botu işə salmaq üçün: start.bat (Windows) və ya: python -m leadsbot serve")
    return 0
