from __future__ import annotations

import time

import requests

MAX_LEN = 4096


class TelegramError(Exception):
    pass


class TelegramClient:
    def __init__(self, token: str, timeout: int = 35, session: requests.Session | None = None):
        if not token:
            raise TelegramError("Telegram token boşdur")
        self._base = f"https://api.telegram.org/bot{token}/"
        self.timeout = timeout
        self.session = session or requests.Session()

    def call(self, method: str, _retries: int = 2, **params):
        url = self._base + method
        try:
            r = self.session.post(url, json=params, timeout=self.timeout)
        except requests.RequestException as exc:
            # exc mətnində URL (və deməli token) olur — onu heç vaxt göstərmə
            raise TelegramError(f"{method}: şəbəkə xətası ({exc.__class__.__name__}), internet bağlantısını yoxlayın") from None
        try:
            data = r.json()
        except ValueError as exc:
            raise TelegramError(f"{method}: cavab JSON deyil (HTTP {r.status_code})") from exc
        if data.get("ok"):
            return data.get("result")
        if r.status_code == 429 and _retries > 0:
            wait = int((data.get("parameters") or {}).get("retry_after", 3))
            time.sleep(min(wait, 60))
            return self.call(method, _retries=_retries - 1, **params)
        raise TelegramError(f"{method}: {data.get('description', 'naməlum xəta')} (HTTP {r.status_code})")

    def get_me(self) -> dict:
        return self.call("getMe")

    def send_message(self, chat_id: str | int, text: str, parse_mode: str = "HTML", preview: bool = False) -> None:
        for chunk in _chunks(text, MAX_LEN):
            self.call(
                "sendMessage",
                chat_id=chat_id,
                text=chunk,
                parse_mode=parse_mode,
                disable_web_page_preview=not preview,
            )

    def get_updates(self, offset: int | None = None, timeout: int = 30) -> list[dict]:
        params = {"timeout": timeout, "allowed_updates": ["message", "edited_message"]}
        if offset is not None:
            params["offset"] = offset
        old = self.timeout
        self.timeout = timeout + 10
        try:
            return self.call("getUpdates", **params) or []
        finally:
            self.timeout = old


def _chunks(text: str, limit: int) -> list[str]:
    if len(text) <= limit:
        return [text]
    out, buf = [], ""
    for line in text.split("\n"):
        if len(buf) + len(line) + 1 > limit:
            if buf:
                out.append(buf)
            buf = line[:limit]
        else:
            buf = f"{buf}\n{line}" if buf else line
    if buf:
        out.append(buf)
    return out
