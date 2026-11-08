from __future__ import annotations

import html
import sqlite3

from .models import Item, MatchResult

CATEGORY_META = {
    "company": ("🏢", "Şirkət lidi"),
    "individual": ("🧑‍💼", "Fərdi sorğu"),
    "job": ("💼", "İş elanı"),
    "tender": ("📑", "Tender / konsultant"),
    "dispute": ("⚖️", "Mübahisə / arbitraj"),
    "other": ("🔎", "Digər"),
}


def esc(s: str | None) -> str:
    return html.escape(s or "", quote=False)


def category_label(cat: str | None) -> str:
    icon, label = CATEGORY_META.get(cat or "other", CATEGORY_META["other"])
    return f"{icon} <b>{label}</b>"


def format_item(item: Item, match: MatchResult, source_name: str) -> str:
    lines = [f"{category_label(match.category)} · {esc(source_name)}", f"<b>{esc(item.title)}</b>"]
    meta = []
    if item.origin:
        meta.append(esc(item.origin))
    if item.published:
        meta.append(esc(item.published[:25]))
    if meta:
        lines.append(" · ".join(meta))
    if item.summary:
        snippet = item.summary.strip()
        if len(snippet) > 280:
            snippet = snippet[:277].rstrip() + "…"
        lines.append(f"<i>{esc(snippet)}</i>")
    if match.hits:
        lines.append("Açar sözlər: " + esc(", ".join(match.hits[:6])))
    if item.link:
        lines.append(f'<a href="{esc(item.link)}">Linki aç</a>')
    return "\n".join(lines)


def format_row(row: sqlite3.Row, source_name: str) -> str:
    """Bazadakı sətirdən mesaj (növbədən göndərmək və /last üçün)."""
    item = Item(
        source_id=row["source_id"], uid=row["uid"], title=row["title"] or "", link=row["link"] or "",
        summary="", published=row["published"] or "", origin=row["origin"] or "",
    )
    hits = [h for h in (row["hits"] or "").split(", ") if h]
    match = MatchResult(category=row["category"] or "other", score=row["score"] or 0, hits=hits)
    return format_item(item, match, source_name)


def format_short(row: sqlite3.Row, source_name: str) -> str:
    icon, _ = CATEGORY_META.get(row["category"] or "other", CATEGORY_META["other"])
    title = esc((row["title"] or "")[:90])
    link = esc(row["link"] or "")
    return f'{icon} <a href="{link}">{title}</a> — {esc(source_name)} ({esc((row["first_seen"] or "")[:10])})'
