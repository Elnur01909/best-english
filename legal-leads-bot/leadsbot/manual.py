"""Bot özü oxuya bilmədiyi saytlarda (LinkedIn) tapılan müraciətləri botun növbəsinə qoyur.

Müraciəti istifadəçinin Chrome-unda Claude tapır və `python -m leadsbot add` ilə bura verir.
Bot onu növbəti dövrədə Claude ilə qiymətləndirir və adi lid kimi, düymələri ilə Telegram-a göndərir.
Eyni link ikinci dəfə əlavə olunmur."""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlsplit

from .models import Item, MatchResult
from .storage import Store

MANUAL_SOURCES = {"linkedin": "LinkedIn"}


def lead_uid(link: str) -> str:
    """Eyni yazının linki sorğu parametrləri ilə fərqlənə bilər: ?utm=..., #comments, sonda '/'."""
    parts = urlsplit(link.strip())
    path = re.sub(r"/+$", "", parts.path)
    return f"{parts.netloc.lower().removeprefix('www.')}{path}"


def load_leads_file(path: Path) -> list[dict]:
    data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list) or not all(isinstance(x, dict) for x in data):
        raise ValueError("fayl JSON siyahısı olmalıdır: [{\"link\": ..., \"title\": ..., \"text\": ...}]")
    return data


def add_manual_leads(store: Store, source_id: str, leads: list[dict]) -> list[tuple[str, str]]:
    """Hər lid üçün (nəticə, başlıq) qaytarır. Nəticə: pending | known | duplicate | invalid."""
    out = []
    for lead in leads:
        link = str(lead.get("link") or "").strip()
        title = " ".join(str(lead.get("title") or "").split())
        if not re.match(r"https?://", link) or not title:
            out.append(("invalid", title or link or "?"))
            continue
        uid = lead_uid(link)
        if store.is_seen(source_id, uid):
            out.append(("known", title))
            continue
        who = " ".join(str(lead.get("who") or "").split())
        text = str(lead.get("text") or "").strip()
        summary = "\n".join(x for x in (f"Kim yazıb: {who}" if who else "", text) if x)
        item = Item(source_id=source_id, uid=uid, title=title, link=link, summary=summary,
                    published=str(lead.get("date") or "").strip(), origin=who)
        outcome = store.add_item(item, MatchResult(category="individual", score=5, hits=[source_id]))
        out.append((outcome, title))
    return out
