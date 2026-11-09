from __future__ import annotations

import html
import sqlite3

CATEGORY_META = {
    "company": ("🏢", "Şirkət lidi"),
    "individual": ("🧑‍💼", "Fərdi sorğu"),
    "job": ("💼", "İş elanı"),
    "tender": ("📑", "Tender / konsultant"),
    "dispute": ("⚖️", "Mübahisə / arbitraj"),
    "other": ("🔎", "Digər"),
}

STATUS_LABELS = {
    "new": "Yeni",
    "interested": "⭐ Maraqlıdır",
    "contacted": "📞 Əlaqə saxlanılıb",
    "not_relevant": "❌ Uyğun deyil",
    "duplicate": "Təkrar",
    "low": "Aşağı bal",
    "hidden": "Göndərilməyən növ",
}

# callback kodları → status
BUTTON_STATUS = {"i": "interested", "c": "contacted", "x": "not_relevant"}


def esc(s: str | None) -> str:
    return html.escape(s or "", quote=False)


def _cat(row: sqlite3.Row) -> str:
    keys = row.keys()
    cat = (row["ai_category"] if "ai_category" in keys and row["ai_category"] else None) or row["category"]
    return cat or "other"


def category_label(cat: str | None) -> str:
    icon, label = CATEGORY_META.get(cat or "other", CATEGORY_META["other"])
    return f"{icon} <b>{label}</b>"


def _snippet(text: str | None, limit: int = 280) -> str:
    t = (text or "").strip()
    return t if len(t) <= limit else t[: limit - 3].rstrip() + "…"


def format_row(row: sqlite3.Row, source_name: str) -> str:
    """Bazadakı sətirdən lid kartı (HTML)."""
    keys = row.keys()
    lines = [f"{category_label(_cat(row))} · {esc(source_name)}"]
    score = row["ai_score"] if "ai_score" in keys else None
    if score:
        lines[0] += f" · <b>{int(score)}/10</b>"
    lines.append(f"<b>{esc(row['title'])}</b>")
    meta = [esc(x) for x in (row["origin"], (row["published"] or "")[:25]) if x]
    if meta:
        lines.append(" · ".join(meta))
    ai_summary = row["ai_summary"] if "ai_summary" in keys else None
    if ai_summary:
        lines.append(f"📝 {esc(ai_summary)}")
        if row["ai_service"]:
            lines.append(f"🧭 Xidmət: {esc(row['ai_service'])}")
        if row["ai_reason"]:
            lines.append(f"<i>{esc(row['ai_reason'])}</i>")
    else:
        summary = row["summary"] if "summary" in keys else ""
        if summary:
            lines.append(f"<i>{esc(_snippet(summary))}</i>")
        if row["hits"]:
            lines.append("Açar sözlər: " + esc(", ".join((row["hits"] or "").split(", ")[:6])))
    if "status" in keys and row["status"] in ("interested", "contacted", "not_relevant"):
        lines.append(f"Status: {STATUS_LABELS[row['status']]}")
    if row["link"]:
        lines.append(f'<a href="{esc(row["link"])}">Linki aç</a>' + (f" · /l{row['id']}" if "id" in keys else ""))
    return "\n".join(lines)


def lead_keyboard(item_id: int, status: str | None = None) -> dict:
    def btn(code: str, label: str) -> dict:
        active = BUTTON_STATUS.get(code) == status
        return {"text": ("✅ " if active else "") + label, "callback_data": f"s:{item_id}:{code}"}

    return {"inline_keyboard": [
        [btn("i", "⭐ Maraqlıdır"), btn("c", "📞 Əlaqə saxladım")],
        [btn("x", "❌ Uyğun deyil"), {"text": "✍️ Məktub hazırla", "callback_data": f"s:{item_id}:d"}],
    ]}


def format_short(row: sqlite3.Row, source_name: str) -> str:
    icon, _ = CATEGORY_META.get(_cat(row), CATEGORY_META["other"])
    title = esc((row["title"] or "")[:90])
    link = esc(row["link"] or "")
    score = row["ai_score"] if "ai_score" in row.keys() else None
    badge = f"[{int(score)}/10] " if score else ""
    return f'{icon} {badge}<a href="{link}">{title}</a> — {esc(source_name)} · /l{row["id"]}'


def format_digest(rows: list[sqlite3.Row], names: dict[str, str], size: int, date_label: str, signals: bool = False) -> str:
    if not rows:
        return f"☀️ <b>Səhər xülasəsi · {esc(date_label)}</b>\nSon xülasədən bəri yeni lid yoxdur."
    shown = rows[:size]
    if signals and all(_cat(r) == "company" for r in rows):
        lines = [f"📡 <b>Şirkət siqnalları · {esc(date_label)}</b> — {len(rows)} xəbər",
                 "Bu şirkətlər Azərbaycana girir, amma hələ kömək istəməyib."]
    else:
        lines = [f"☀️ <b>Səhər xülasəsi · {esc(date_label)}</b> — {len(rows)} lid"]
    for i, r in enumerate(shown, 1):
        icon, _ = CATEGORY_META.get(_cat(r), CATEGORY_META["other"])
        score = f"<b>{int(r['ai_score'])}/10</b> " if r["ai_score"] else ""
        service = f" — {esc(r['ai_service'])}" if r["ai_service"] else ""
        lines.append(f"{i}. {icon} {score}{esc((r['title'] or '')[:110])}{service} · /l{r['id']}")
    if len(rows) > size:
        lines.append(f"…və daha {len(rows) - size} lid. Hamısı: /last 30")
    lines.append("Kartı və düymələri görmək üçün /l nömrəsinə basın.")
    return "\n".join(lines)
