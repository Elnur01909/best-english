from __future__ import annotations

import hashlib
import os
import re
import time
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
RELIEFWEB_URL = "https://api.reliefweb.int/v2/jobs"
# forum siyahılarında mövzu linki olmayan köməkçi linklər ("Last post 6 years ago by ...", "3 replies", "Page 2")
JUNK_ANCHOR = re.compile(
    r"^(last post\b|latest reply\b|reply\b|replies\b|son (mesaj|cavab)\b|"
    r"page\s*\d+$|\d+\s*(replies|views|cavab|baxış)?$)",
    re.I,
)
# link sadəcə düymədir ("Müraciət et", "ətraflı"): elanın adı linkdə yox, kartın başlığındadır
BUTTON_ANCHOR = re.compile(
    r"^(müraciət et|apply( now)?|ətraflı( məlumat| oxu)?|daha çox( oxu)?|read more|learn more|more|davamı|"
    r"davamını oxu|oxumağa davam edin|подробнее|читать далее|далее)\W*$",
    re.I,
)
CARD_TAGS = ["li", "tr", "article", "div"]
MAX_CARD_DEPTH = 4
HEADINGS = ["h1", "h2", "h3", "h4", "h5"]
MIN_HOST_GAP = 3.0  # eyni sayta ardıcıl sorğular arasında saniyə (Reddit 429 verməsin)
MAX_RETRY_AFTER = 30
_LAST_HIT: dict[str, float] = {}


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
    if src.type == "tg_channel":
        return f"https://t.me/s/{src.channel}"
    if src.type == "reliefweb_jobs":
        appname = os.getenv("RELIEFWEB_APPNAME", "").strip() or "legal-leads-bot"
        return f"{RELIEFWEB_URL}?appname={quote_plus(appname)}"
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


def _item_keys(el, rx: re.Pattern, base: str, cache: dict[int, set[str]]) -> set[str]:
    """Bloğun içindəki elan linkləri. Böyük səhifələrdə yavaşlamasın deyə hər blok üçün bir dəfə hesablanır."""
    keys = cache.get(id(el))
    if keys is None:
        hrefs = (urljoin(base, x.get("href", "").strip()).split("#", 1)[0] for x in el.select("a[href]")
                 if not JUNK_ANCHOR.match(x.get_text(" ", strip=True)))
        keys = cache[id(el)] = {h for h in hrefs if rx.search(h)}
    return keys


def _own_card(a, key: str, rx: re.Pattern, base: str, cache: dict[int, set[str]]):
    """Linkin aid olduğu kart: içində başqa elan linki olmayan ən böyük blok."""
    card = None
    for parent in a.find_parents(CARD_TAGS, limit=MAX_CARD_DEPTH):
        if _item_keys(parent, rx, base, cache) - {key}:
            break
        card = parent
    return card


def parse_html_links(html: str, src: Source, base_url: str | None = None) -> list[Item]:
    rx = re.compile(src.link_pattern)
    soup = BeautifulSoup(html, "html.parser")
    base = base_url or src.url
    found: dict[str, Item] = {}
    cache: dict[int, set[str]] = {}
    for a in soup.select("a[href]"):
        href = urljoin(base, a.get("href", "").strip())
        if not rx.search(href):
            continue
        key = href.split("#", 1)[0]
        title = a.get_text(" ", strip=True)
        if title and JUNK_ANCHOR.match(title):
            continue
        container = a.find_parent(CARD_TAGS)
        if container is not None and _item_keys(container, rx, base, cache) - {key}:
            container = None  # blok bir neçə elanı əhatə edir, onun mətni bu elana aid deyil
        if not title or BUTTON_ANCHOR.match(title):
            card = _own_card(a, key, rx, base, cache)
            if card is not None:
                container = card
                heading = card.find(HEADINGS)
                title = (heading or card).get_text(" ", strip=True)[:140]
            elif title:
                continue  # düymədir, amma öz kartı yoxdur: adını götürəcək yer yoxdur
        summary = container.get_text(" ", strip=True)[:600] if container else ""
        existing = found.get(key)
        if existing is None:
            found[key] = Item(src.id, key, title, key, summary, "", _domain(key))
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


def _tg_title(text: str) -> str:
    """Postun ilk mənalı sətri: yalnız emoji və ya bəzəkdən ibarət sətirlər keçilir."""
    for line in text.splitlines():
        clean = re.sub(r"^[\W_]+", "", line).strip()
        if sum(c.isalpha() for c in clean) >= 3:
            return clean[:140]
    return text.strip()[:140]


def parse_tg_channel(html: str, src: Source) -> list[Item]:
    """t.me/s/<kanal> ictimai önizləmə səhifəsindən son postlar (ən yenisi birinci)."""
    soup = BeautifulSoup(html, "html.parser")
    channel_title = ""
    head = soup.select_one(".tgme_channel_info_header_title")
    if head:
        channel_title = head.get_text(" ", strip=True)
    items: list[Item] = []
    for msg in soup.select("div.tgme_widget_message[data-post]"):
        post = msg.get("data-post", "").strip()
        if not post:
            continue
        body = msg.select_one(".tgme_widget_message_text")
        text = body.get_text("\n", strip=True) if body else ""
        if not text:
            continue  # yalnız şəkil/video olan postlar
        title = _tg_title(text)
        t = msg.select_one("time[datetime]")
        published = t.get("datetime", "") if t else ""
        items.append(Item(src.id, f"tg:{post}", title, f"https://t.me/{post}", text[:1500], published,
                          channel_title or f"@{src.channel}"))
    items.reverse()
    return items[: src.max_items]


# ──────────────────────────── şəbəkə ────────────────────────────

def _session(user_agent: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,az;q=0.8,ru;q=0.7",
    })
    return s


def _polite_wait(host: str) -> None:
    last = _LAST_HIT.get(host)
    if last is not None:
        gap = time.monotonic() - last
        if gap < MIN_HOST_GAP:
            time.sleep(MIN_HOST_GAP - gap)
    _LAST_HIT[host] = time.monotonic()


def _retry_after(resp: requests.Response) -> int:
    raw = (resp.headers or {}).get("Retry-After", "")
    try:
        return max(1, min(MAX_RETRY_AFTER, int(float(raw))))
    except (TypeError, ValueError):
        return 10


def _request(s: requests.Session, method: str, url: str, timeout: int, **kw) -> requests.Response:
    """Eyni hosta fasilə ilə sorğu; 429 gəlsə Retry-After qədər gözləyib bir dəfə təkrarlayır."""
    host = _domain(url)
    for attempt in range(2):
        _polite_wait(host)
        r = s.request(method, url, timeout=timeout, **kw)
        if r.status_code == 429 and attempt == 0:
            time.sleep(_retry_after(r))
            continue
        r.raise_for_status()
        return r
    r.raise_for_status()
    return r


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
            r = _request(s, "POST", url, timeout, json=payload)
            return parse_reliefweb(r.json(), src)

        r = _request(s, "GET", url, timeout)
        if src.type in ("rss", "gnews"):
            return parse_rss(r.content, src)
        if src.type == "html_links":
            r.encoding = r.encoding or "utf-8"
            return parse_html_links(r.text, src, base_url=str(r.url))
        if src.type == "tg_channel":
            r.encoding = r.encoding or "utf-8"
            return parse_tg_channel(r.text, src)
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
