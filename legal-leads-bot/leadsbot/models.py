from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date

CATEGORIES = ("company", "individual", "job", "tender", "dispute", "other")
LEAD_TYPES = ("individual", "job", "tender", "company", "dispute")
SOURCE_TYPES = ("gnews", "rss", "html_links", "reliefweb_jobs", "tg_channel")
TG_HANDLE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{3,31}$")


@dataclass
class Source:
    """Bir mənbənin konfiqurasiyası (config/sources.yaml və ya /addtg ilə əlavə edilən)."""

    id: str
    name: str
    type: str  # gnews | rss | html_links | reliefweb_jobs | tg_channel
    category: str = "other"
    url: str = ""
    query: str = ""
    lang: str = "en"
    link_pattern: str = ""
    channel: str = ""  # tg_channel üçün kanal adı (@ olmadan)
    categories: list[str] | None = None  # bu mənbədə hansı açar söz kateqoriyaları sayılır; None = hamısı
    disable_after: str = ""  # YYYY-MM-DD; bu tarixdən sonra mənbə avtomatik söndürülür
    require_geo: bool = True
    enabled: bool = True
    note: str = ""
    max_items: int = 60
    every_hours: float = 0  # >0 → yalnız bu qədər saatda bir oxunur (ağır və ya məhdudiyyətli saytlar)
    legal_forum: bool = False  # True → hər yazı hüquqi sualdır, ümumi söz ("miras", "долг") də kifayətdir
    ai_screen: bool = False  # True → Claude varsa, açar söz olmasa da hər yeni yazını o oxuyur (insanların sual yazdığı yerlər)
    expect_empty: bool = False  # True → boş qalması normaldır, "boşdur" xəbərdarlığı göndərilmir
    user_added: bool = False

    @classmethod
    def from_dict(cls, d: dict) -> "Source":
        known = set(cls.__dataclass_fields__)  # noqa: F821
        clean = {k: v for k, v in d.items() if k in known}
        src = cls(**clean)
        if src.type not in SOURCE_TYPES:
            raise ValueError(f"source {src.id!r}: unknown type {src.type!r}")
        if src.type == "gnews" and not src.query:
            raise ValueError(f"source {src.id!r}: gnews needs 'query'")
        if src.type in ("rss", "html_links") and not src.url:
            raise ValueError(f"source {src.id!r}: {src.type} needs 'url'")
        if src.type == "html_links" and not src.link_pattern:
            raise ValueError(f"source {src.id!r}: html_links needs 'link_pattern'")
        if src.type == "tg_channel" and not TG_HANDLE_RE.match(src.channel or ""):
            raise ValueError(f"source {src.id!r}: tg_channel needs a valid 'channel'")
        if src.category not in CATEGORIES:
            raise ValueError(f"source {src.id!r}: unknown category {src.category!r}")
        if src.categories is not None:
            bad = [c for c in src.categories if c not in CATEGORIES]
            if bad:
                raise ValueError(f"source {src.id!r}: unknown categories {bad}")
        if src.disable_after:
            date.fromisoformat(str(src.disable_after))  # ValueError səhv formatda
            src.disable_after = str(src.disable_after)
        return src

    def expired(self, today: date) -> bool:
        return bool(self.disable_after) and today > date.fromisoformat(self.disable_after)


@dataclass
class Item:
    """Mənbədən gələn bir element (xəbər, post, elan)."""

    source_id: str
    uid: str
    title: str
    link: str
    summary: str = ""
    published: str = ""
    origin: str = ""  # nəşriyyat / domen / təşkilat

    @property
    def text(self) -> str:
        return f"{self.title}\n{self.summary}"


@dataclass
class MatchResult:
    category: str
    score: int
    hits: list[str] = field(default_factory=list)
    geo_hits: list[str] = field(default_factory=list)


def normalize_tg_handle(raw: str) -> str | None:
    """'@kanal', 't.me/kanal', 'https://t.me/s/kanal/123' → 'kanal'. Uyğun deyilsə None."""
    s = (raw or "").strip()
    s = re.sub(r"^https?://", "", s, flags=re.I)
    s = re.sub(r"^(www\.)?(t|telegram)\.me/", "", s, flags=re.I)
    s = re.sub(r"^s/", "", s)
    s = s.lstrip("@").split("/", 1)[0].split("?", 1)[0]
    return s if TG_HANDLE_RE.match(s) else None
