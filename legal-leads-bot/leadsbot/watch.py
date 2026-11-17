"""İzləmə siyahısı: çox elan çıxan səhifələrdən (universitet vakansiyaları, tenderlər, frilans) yalnız yeni elanları göstərir.

Belə səhifələrdə elanların çoxu uyğun deyil, ona görə bot onları özü qiymətləndirmir: hər elan Claude API pulu deməkdir.
Gündəlik internet araşdırması `python -m leadsbot watch` ilə yeni elanları oxuyur, uyğun olanı
`python -m leadsbot add --source web` ilə botun növbəsinə qoyur. `python -m leadsbot page <link>` bir səhifənin mətnini verir.
"""
from __future__ import annotations

import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from .config import load_sources
from .models import Item, Source
from .sources import FetchError, _domain, _request, _session, fetch_source
from .storage import Store

WATCH_PREFIX = "watch:"  # items cədvəlində izləmə səhifələrinin elanları bu ad altında saxlanır
BUTTON_WORDS = re.compile(r"^(view details|read more|apply now|new)\s+", re.I)  # kartın düyməsi başlığa yapışır
NOISE_TAGS = ("script", "style", "noscript", "svg", "nav", "footer", "header", "form", "iframe")


def watch_pages(path: Path, only: set[str] | None = None, group: str | None = None) -> list[Source]:
    pages = [p for p in load_sources(path) if p.enabled]
    if only:
        pages = [p for p in pages if p.id in only]
    if group:
        pages = [p for p in pages if p.category == group]
    return pages


def new_items(store: Store, page: Source, items: list[Item], mark: bool = True) -> list[Item]:
    """Bu səhifədə əvvəl göstərilməmiş elanlar. mark=True → göstərilmiş kimi yadda saxlanır."""
    sid = WATCH_PREFIX + page.id
    fresh = [it for it in items if not store.is_seen(sid, it.uid)]
    if mark:
        for it in fresh:
            store.add_item(Item(sid, it.uid, it.title, it.link, "", it.published, it.origin), None)
    return fresh


def render_watch(store: Store, pages: list[Source], user_agent: str, timeout: int, mark: bool = True,
                 limit: int = 25, chars: int = 280) -> str:
    out: list[str] = []
    for page in pages:
        try:
            items = fetch_source(page, user_agent, timeout)
        except FetchError as exc:
            out.append(f"## {page.id} — OXUNMADI: {exc}\n   {page.url}")
            continue
        fresh = new_items(store, page, items, mark=mark)
        out.append(f"## {page.id} — {page.name}: {len(fresh)} yeni / {len(items)}")
        for n, it in enumerate(fresh[:limit], 1):
            title = BUTTON_WORDS.sub("", " ".join(it.title.split()))
            out.append(f"{n}. {title[:200]}")
            out.append(f"   {it.link}")
            extra = BUTTON_WORDS.sub("", " ".join((it.summary or "").split()))
            if title and extra.startswith(title):
                extra = extra[len(title):].strip()
            when = f"[{it.published[:16].strip()}] " if it.published else ""
            if when or extra:
                out.append(f"   {when}{extra[:chars]}")
        if len(fresh) > limit:
            out.append(f"   … və daha {len(fresh) - limit} yeni elan (səhifəni özünüz açın: {page.url})")
    return "\n".join(out)


def read_page(url: str, user_agent: str, timeout: int = 25, chars: int = 6000) -> str:
    """Səhifənin oxunaqlı mətni: menyu, skript və formalar çıxarılır."""
    try:
        r = _request(_session(user_agent), "GET", url, timeout)
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else "?"
        raise FetchError(f"HTTP {code} ({_domain(url)})") from exc
    except requests.Timeout as exc:
        raise FetchError(f"vaxt bitdi ({_domain(url)})") from exc
    except requests.RequestException as exc:
        raise FetchError(f"şəbəkə xətası: {exc.__class__.__name__} ({_domain(url)})") from exc
    r.encoding = r.encoding or "utf-8"
    soup = BeautifulSoup(r.text, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    for tag in soup(NOISE_TAGS):
        tag.decompose()
    body = soup.find("main") or soup.find("article") or soup.body or soup
    text = re.sub(r"\s+", " ", body.get_text(" ", strip=True))
    return f"{title}\n{r.url}\n\n{text[:chars]}"
