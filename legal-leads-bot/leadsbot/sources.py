from __future__ import annotations

import hashlib
import re
from urllib.parse import quote_plus, urljoin, urlparse

import feedparser
import requests
from bs4 import BeautifulSoup

from .models import Item, Source

GNEWS_LOCALES = {
    "en": ("en-US", "US", "US:en"),
    "az": ("az", "AZ", "AZ:az"),
    "ru": ("ru", "RU", "RU:ru"),
}
RELIEFWEB_URL = "https://api.reliefweb.int/v1/jobs?appname=legal-leads-bot"


class FetchError(Exception):
    pass


def strip_html(text: str | None) -> str:
    if not text:
        return ""
    return BeautifulSoup(text, "html.parser").get_text(" ", strip=True)


def _uid(*parts: str) -> str:
    raw = "||".join(p or "" for p in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:20]


def _domain(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
    except ValueError:
        return ""
    return host[4:] if host.startswith("www.") else host


def build_url(src: Source) -> str:
    if src.type == "gnews":
        hl, gl, ceid = GNEWS_LOCALES.get(src.lang, GNEWS_LOCALES["en"])
        return f"https://news.google.com/rss/search?q={quote_plus(src.query)}&hl={hl}&gl={gl}&ceid={ceid}"
    if src.type == "reliefweb_jobs":
        return RELIEFWEB_URL
    return src.url


# ──────────────────────────── parsers (şəbəkəsiz, testlənə bilən) ────────────────────────────

def parse_rss(content: bytes | str, src: Source) -> list[Item]:
    parsed = feedparser.parse(content)
    if getattr(parsed, "bozo", 0) and not parsed.entries:
        reason = getattr(parsed, "bozo_exception", "invalid feed")
        raise FetchError(f"RSS oxunmadı: {reason}")
    items: list[Item] = []
    for e in parsed.entries[: src.max_items]:
        title = strip_html(e.get("title", "")).strip()
        link = (e.get("link") or "").strip()
        if not title and not link:
            continue
        summary = strip_html(e.get("summary") or e.get("description") or "")
        if not summary and e.get("content"):
            summary = strip_html(e["content"][0].get("value", ""))
        published = e.get("published") or e.get("updated") or ""
        origin = ""
        source_tag = e.get("source")
        if isinstance(source_tag, dict):
            origin = source_tag.get("title", "") or ""
        if not origin:
            origin = _domain(link)
        uid = (e.get("id") or link or _uid(title, published)).strip()
        items.append(Item(src.id, uid, title or link, link, summary[:1500], published, origin))
    return items


def parse_html_links(html: str, src: Source, base_url: str | None = None) -> list[Item]:
    rx = re.compile(src.link_pattern)
    soup = BeautifulSoup(html, "html.parser")
    base = base_url or src.url
    found: dict[str, Item] = {}
    for a in soup.select("a[href]"):
        href = urljoin(base, a.get("href", "").strip())
        if not rx.search(href):
            continue
        key = href.split("#", 1)[0]
        title = a.get_text(" ", strip=True)
        container = a.find_parent(["li", "tr", "article", "div"])
        summary = container.get_text(" ", strip=True)[:600] if container else ""
        existing = found.get(key)
        if existing is None:
            found[key] = Item(src.id, key, title or key, key, summary, "", _domain(key))
        elif len(title) > len(existing.title) and title:
            existing.title = title
            if summary:
                existing.summary = summary
    items = list(found.values())
    for it in items:
        if len(it.title) < 4:
            it.title = it.summary[:120] or it.link
    return items[: src.max_items]


def parse_reliefweb(data: dict, src: Source) -> list[Item]:
    items: list[Item] = []
    for row in (data.get("data") or [])[: src.max_items]:
        f = row.get("fields") or {}
        title = (f.get("title") or "").strip()
        link = f.get("url") or f.get("url_alias") or ""
        orgs = f.get("source") or []
        origin = ", ".join(o.get("name", "") for o in orgs if isinstance(o, dict)) or "ReliefWeb"
        published = ((f.get("date") or {}).get("created")) or ""
        summary = strip_html(f.get("body") or f.get("body-html") or "")[:1500]
        uid = f"reliefweb:{row.get('id') or link}"
        items.append(Item(src.id, uid, title or link, link, summary, published, origin))
    return items


# ──────────────────────────── şəbəkə ────────────────────────────

def _session(user_agent: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,az;q=0.8,ru;q=0.7",
    })
    return s


def fetch_source(src: Source, user_agent: str, timeout: int = 25, session: requests.Session | None = None) -> list[Item]:
    """Mənbəni şəbəkədən oxuyur. Xəta olduqda FetchError atır."""
    s = session or _session(user_agent)
    url = build_url(src)
    try:
        if src.type == "reliefweb_jobs":
            payload = {
                "filter": {"field": "country.name", "value": "Azerbaijan"},
                "fields": {"include": ["title", "url", "url_alias", "date.created", "source.name", "body"]},
                "sort": ["date.created:desc"],
                "limit": min(src.max_items, 100),
            }
            r = s.post(url, json=payload, timeout=timeout)
            r.raise_for_status()
            return parse_reliefweb(r.json(), src)

        r = s.get(url, timeout=timeout)
        r.raise_for_status()
        if src.type in ("rss", "gnews"):
            return parse_rss(r.content, src)
        if src.type == "html_links":
            r.encoding = r.encoding or "utf-8"
            return parse_html_links(r.text, src, base_url=str(r.url))
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else "?"
        raise FetchError(f"HTTP {code} ({_domain(url)})") from exc
    except requests.Timeout as exc:
        raise FetchError(f"vaxt bitdi ({_domain(url)})") from exc
    except requests.RequestException as exc:
        raise FetchError(f"şəbəkə xətası: {exc.__class__.__name__} ({_domain(url)})") from exc
    except ValueError as exc:  # JSON decode
        raise FetchError(f"cavab oxunmadı: {exc}") from exc
    raise FetchError(f"naməlum mənbə tipi: {src.type}")
