from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .config import Settings
from .filters import Matcher
from .formatting import format_item, format_row
from .models import Source
from .sources import FetchError, fetch_source
from .storage import Store
from .telegram import TelegramClient, TelegramError

log = logging.getLogger("leadsbot")


@dataclass
class SourceReport:
    source_id: str
    name: str
    fetched: int = 0
    new: int = 0
    matched: int = 0
    baseline: bool = False
    skipped: bool = False
    error: str | None = None


@dataclass
class CycleReport:
    started: str
    sources: list[SourceReport] = field(default_factory=list)
    sent: int = 0
    pending: int = 0
    send_errors: list[str] = field(default_factory=list)
    finished: str = ""

    @property
    def total_new(self) -> int:
        return sum(s.new for s in self.sources)

    @property
    def total_matched(self) -> int:
        return sum(s.matched for s in self.sources)

    def summary_text(self) -> str:
        ok = [s for s in self.sources if not s.error and not s.skipped]
        bad = [s for s in self.sources if s.error]
        lines = [
            f"🔄 Dövrə bitdi: {len(ok)} mənbə oxundu, {len(bad)} xəta.",
            f"Yeni element: {self.total_new}, uyğun: {self.total_matched}, göndərildi: {self.sent}, növbədə: {self.pending}.",
        ]
        base = [s.source_id for s in self.sources if s.baseline]
        if base:
            lines.append("İlk dəfə oxundu (başlanğıc nöqtəsi, göndərilmədi): " + ", ".join(base))
        for s in bad:
            lines.append(f"⚠️ {s.source_id}: {s.error}")
        return "\n".join(lines)


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def run_cycle(
    settings: Settings,
    store: Store,
    sources: list[Source],
    matcher: Matcher,
    tg: TelegramClient | None,
    chat_ids: list[str],
    send: bool = True,
    seed_only: bool = False,
    dry_run: bool = False,
    only: set[str] | None = None,
) -> CycleReport:
    """Bir tam dövrə: mənbələri oxu → filtrlə → yadda saxla → növbədəkiləri göndər.

    - Mənbə ilk dəfə oxunursa (bazada heç nə yoxdur) bütün elementlər sükutla qeyd olunur
      (başlanğıc nöqtəsi) — köhnə xəbər seli olmasın.
    - seed_only=True → yalnız başlanğıc nöqtəsi; heç nə göndərilmir.
    - dry_run=True → göndərilməli mesajlar ekrana yazılır, baza 'sent' kimi işarələnmir.
    """
    report = CycleReport(started=_now())
    names = {s.id: s.name for s in sources}

    for src in sources:
        rep = SourceReport(source_id=src.id, name=src.name)
        report.sources.append(rep)
        if only and src.id not in only:
            rep.skipped = True
            continue
        if not store.source_enabled(src.id, src.enabled):
            rep.skipped = True
            continue
        try:
            items = fetch_source(src, settings.user_agent, settings.request_timeout)
        except FetchError as exc:
            rep.error = str(exc)
            store.set_source_state(src.id, "error", 0, rep.error)
            log.warning("%s: %s", src.id, exc)
            continue
        except Exception as exc:  # gözlənilməz xəta bir mənbəni dayandırsın, botu yox
            rep.error = f"{exc.__class__.__name__}: {exc}"
            store.set_source_state(src.id, "error", 0, rep.error)
            log.exception("%s: gözlənilməz xəta", src.id)
            continue

        rep.fetched = len(items)
        baseline = seed_only or not store.has_any(src.id)
        rep.baseline = baseline
        for it in items:
            if store.is_seen(src.id, it.uid):
                continue
            match = matcher.evaluate(it.text, src.category, src.require_geo)
            rep.new += 1
            if match:
                rep.matched += 1
            store.add_item(it, match, suppress=baseline)
        store.set_source_state(src.id, "ok", len(items), None)
        log.info("%s: %d element, %d yeni, %d uyğun%s", src.id, rep.fetched, rep.new, rep.matched,
                 " (başlanğıc)" if baseline else "")

    if seed_only:
        report.pending = store.pending_count()
        report.finished = _now()
        return report

    # ── göndərmə ──
    if send or dry_run:
        rows = store.pending(settings.max_per_cycle)
        for row in rows:
            text = format_row(row, names.get(row["source_id"], row["source_id"]))
            if dry_run:
                print("─" * 60)
                print(_plain(text))
                report.sent += 1
                continue
            if tg is None or not chat_ids:
                break
            delivered = False
            for chat in chat_ids:
                try:
                    tg.send_message(chat, text)
                    delivered = True
                except TelegramError as exc:
                    report.send_errors.append(f"{chat}: {exc}")
                    log.warning("Telegram göndərmə xətası (%s): %s", chat, exc)
            if delivered:
                store.mark_sent(row["source_id"], row["uid"])
                report.sent += 1
            else:
                break  # Telegram işləmirsə növbəni saxla, sonra yenidən cəhd et
    report.pending = store.pending_count()
    report.finished = _now()
    return report


def _plain(html_text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", html_text).replace("&amp;", "&")


def check_sources(settings: Settings, sources: list[Source], matcher: Matcher, only: set[str] | None = None) -> list[dict]:
    """Hər mənbəni oxuyub nə qədər element və uyğunluq verdiyini qaytarır (bazaya yazmır)."""
    out = []
    for src in sources:
        if only and src.id not in only:
            continue
        row = {"id": src.id, "name": src.name, "enabled": src.enabled, "count": 0, "matched": 0, "error": None, "sample": []}
        try:
            items = fetch_source(src, settings.user_agent, settings.request_timeout)
            row["count"] = len(items)
            for it in items:
                m = matcher.evaluate(it.text, src.category, src.require_geo)
                if m:
                    row["matched"] += 1
                    if len(row["sample"]) < 3:
                        row["sample"].append(f"[{m.category}] {it.title[:90]}")
        except FetchError as exc:
            row["error"] = str(exc)
        except Exception as exc:
            row["error"] = f"{exc.__class__.__name__}: {exc}"
        out.append(row)
    return out
