from __future__ import annotations

from dataclasses import dataclass, field

CATEGORIES = ("company", "individual", "job", "tender", "dispute", "other")


@dataclass
class Source:
    """Bir mənbənin konfiqurasiyası (config/sources.yaml-dan)."""

    id: str
    name: str
    type: str  # gnews | rss | html_links | reliefweb_jobs
    category: str = "other"
    url: str = ""
    query: str = ""
    lang: str = "en"
    link_pattern: str = ""
    require_geo: bool = True
    enabled: bool = True
    note: str = ""
    max_items: int = 60

    @classmethod
    def from_dict(cls, d: dict) -> "Source":
        known = {f for f in cls.__dataclass_fields__}  # noqa: F821
        clean = {k: v for k, v in d.items() if k in known}
        src = cls(**clean)
        if src.type not in ("gnews", "rss", "html_links", "reliefweb_jobs"):
            raise ValueError(f"source {src.id!r}: unknown type {src.type!r}")
        if src.type == "gnews" and not src.query:
            raise ValueError(f"source {src.id!r}: gnews needs 'query'")
        if src.type in ("rss", "html_links") and not src.url:
            raise ValueError(f"source {src.id!r}: {src.type} needs 'url'")
        if src.type == "html_links" and not src.link_pattern:
            raise ValueError(f"source {src.id!r}: html_links needs 'link_pattern'")
        if src.category not in CATEGORIES:
            raise ValueError(f"source {src.id!r}: unknown category {src.category!r}")
        return src


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
