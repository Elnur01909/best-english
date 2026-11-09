from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path

import yaml
from dotenv import load_dotenv

from .filters import KeywordProfile
from .models import LEAD_TYPES, Source

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCES = ROOT / "config" / "sources.yaml"
DEFAULT_KEYWORDS = ROOT / "config" / "keywords.yaml"
DEFAULT_DB = ROOT / "data" / "leads.sqlite"
DEFAULT_UA = "linux:legal-leads-bot:1.0 (RSS/HTML reader for legal-services leads)"
DEFAULT_AI_MODEL = "claude-opus-5-5"
DEFAULT_LEAD_TYPES = ("individual", "job", "tender", "company")  # company: səhər siqnalları (bax signal_min_score)
_HHMM = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)$")


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
    # ── süni intellekt (Claude) ──
    anthropic_api_key: str = ""
    ai_model: str = DEFAULT_AI_MODEL
    ai_effort: str = "low"
    ai_min_score: int = 6
    instant_min_score: int = 8
    ai_max_per_cycle: int = 60
    # ── səhər xülasəsi ──
    digest_time: str = ""  # "HH:MM" yerli vaxtla; boş = xülasə yoxdur, hər şey dərhal gəlir
    digest_size: int = 10
    tz_offset_hours: float = 4.0  # Bakı UTC+4
    # ── nə göndərilsin ──
    lead_types: tuple[str, ...] = DEFAULT_LEAD_TYPES
    signal_min_score: int = 9  # şirkət xəbəri yalnız bu balla və yalnız səhər xülasəsində gəlir; 0 = adi lid kimi dərhal
    max_age_days: int = 30  # tarixi bundan köhnə olan elementlər göndərilmir; 0 = yoxlama yoxdur
    # ── nəzarət ──
    healthcheck_url: str = ""  # hər dövrənin sonunda çağırılır (healthchecks.io); bot susanda sizə xəbər gəlir

    @property
    def ai_enabled(self) -> bool:
        return bool(self.anthropic_api_key)

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
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", "").strip(),
        ai_model=os.getenv("AI_MODEL", "").strip() or DEFAULT_AI_MODEL,
        ai_effort=os.getenv("AI_EFFORT", "").strip() or "low",
        ai_min_score=min(10, max(1, _int_env("AI_MIN_SCORE", 6))),
        instant_min_score=min(10, max(1, _int_env("INSTANT_MIN_SCORE", 8))),
        ai_max_per_cycle=max(1, _int_env("AI_MAX_PER_CYCLE", 60)),
        digest_time=parse_hhmm(os.getenv("DIGEST_TIME", "")),
        digest_size=max(1, _int_env("DIGEST_SIZE", 10)),
        tz_offset_hours=_float_env("TZ_OFFSET_HOURS", 4.0),
        healthcheck_url=os.getenv("HEALTHCHECK_URL", "").strip(),
        lead_types=parse_lead_types(os.getenv("LEAD_TYPES", "").strip() or ",".join(DEFAULT_LEAD_TYPES)),
        signal_min_score=min(10, max(0, _int_env("SIGNAL_MIN_SCORE", 9))),
        max_age_days=max(0, _int_env("MAX_AGE_DAYS", 30)),
    )


def parse_lead_types(raw: str) -> tuple[str, ...]:
    """'individual, job' → ('individual', 'job'); 'all' → hamısı. Səhv sözdə ConfigError."""
    words = raw.lower().replace(",", " ").split()
    if words == ["all"]:
        return LEAD_TYPES
    bad = [w for w in words if w not in LEAD_TYPES]
    if bad or not words:
        raise ConfigError(f"LEAD_TYPES yalnız bunlardan ola bilər: {', '.join(LEAD_TYPES)}")
    return tuple(words)


def parse_hhmm(raw: str) -> str:
    """'9:00' → '09:00'; boş və ya 'off' → ''. Səhv formatda ConfigError."""
    raw = (raw or "").strip().lower()
    if raw in ("", "off", "no", "0"):
        return ""
    m = _HHMM.match(raw)
    if not m:
        raise ConfigError(f"DIGEST_TIME formatı HH:MM olmalıdır, verilib: {raw!r}")
    return f"{int(m.group(1)):02d}:{m.group(2)}"


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} ədəd olmalıdır, verilib: {raw!r}") from exc


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


def all_sources(config_sources: list[Source], store) -> list[Source]:
    """Konfiqurasiyadakı mənbələr + /addtg ilə bazaya əlavə edilənlər (id toqquşması olarsa konfiq qalib gəlir)."""
    ids = {s.id for s in config_sources}
    return list(config_sources) + [s for s in store.user_sources() if s.id not in ids]
