from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml
from dotenv import load_dotenv

from .filters import KeywordProfile
from .models import Source

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCES = ROOT / "config" / "sources.yaml"
DEFAULT_KEYWORDS = ROOT / "config" / "keywords.yaml"
DEFAULT_DB = ROOT / "data" / "leads.sqlite"
DEFAULT_UA = "linux:legal-leads-bot:1.0 (RSS/HTML reader for legal-services leads)"


class ConfigError(Exception):
    pass


@dataclass
class Settings:
    bot_token: str
    allowed_chat_ids: list[str]
    db_path: Path
    sources_file: Path
    keywords_file: Path
    fetch_interval_min: int = 30
    max_per_cycle: int = 15
    request_timeout: int = 25
    user_agent: str = DEFAULT_UA

    def require_token(self) -> str:
        if not self.bot_token:
            raise ConfigError(
                "TELEGRAM_BOT_TOKEN boşdur. .env faylını yaradın (bax: .env.example) "
                "və BotFather-dən aldığınız tokeni yazın."
            )
        return self.bot_token

    def require_chat_ids(self) -> list[str]:
        if not self.allowed_chat_ids:
            raise ConfigError(
                "TELEGRAM_CHAT_ID boşdur. Bota /start yazın, sonra "
                "`python -m leadsbot chatid` ilə ID-nizi tapıb .env-ə yazın."
            )
        return self.allowed_chat_ids


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} tam ədəd olmalıdır, verilib: {raw!r}") from exc


def _path_env(name: str, default: Path) -> Path:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    p = Path(raw)
    return p if p.is_absolute() else (ROOT / p)


def load_settings(env_file: Path | None = None) -> Settings:
    load_dotenv(env_file or (ROOT / ".env"), override=False)
    chat_ids = [c.strip() for c in os.getenv("TELEGRAM_CHAT_ID", "").split(",") if c.strip()]
    return Settings(
        bot_token=os.getenv("TELEGRAM_BOT_TOKEN", "").strip(),
        allowed_chat_ids=chat_ids,
        db_path=_path_env("LEADS_DB_PATH", DEFAULT_DB),
        sources_file=_path_env("SOURCES_FILE", DEFAULT_SOURCES),
        keywords_file=_path_env("KEYWORDS_FILE", DEFAULT_KEYWORDS),
        fetch_interval_min=max(1, _int_env("FETCH_INTERVAL_MIN", 30)),
        max_per_cycle=max(1, _int_env("MAX_PER_CYCLE", 15)),
        request_timeout=max(5, _int_env("REQUEST_TIMEOUT", 25)),
        user_agent=os.getenv("USER_AGENT", "").strip() or DEFAULT_UA,
    )


def load_sources(path: Path) -> list[Source]:
    if not path.exists():
        raise ConfigError(f"Mənbə faylı tapılmadı: {path}")
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    raw = data.get("sources") or []
    sources = [Source.from_dict(d) for d in raw]
    ids = [s.id for s in sources]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        raise ConfigError(f"Təkrar mənbə id-ləri: {sorted(dupes)}")
    return sources


def load_profile(path: Path) -> KeywordProfile:
    if not path.exists():
        raise ConfigError(f"Açar söz faylı tapılmadı: {path}")
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    return KeywordProfile.from_dict(data)
