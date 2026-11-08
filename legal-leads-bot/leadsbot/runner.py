from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime, time as dtime, timedelta, timezone

from .ai import AIError, LeadAI
from .config import Settings
from .filters import Matcher
from .formatting import format_digest, format_row, lead_keyboard
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
    duplicates: int = 0
    baseline: bool = False
    skipped: bool = False
    expired: bool = False
    error: str | None = None


@dataclass
class CycleReport:
    started: str
    sources: list[SourceReport] = field(default_factory=list)
    sent: int = 0
    pending: int = 0
    filtered: int = 0
    queued: int = 0
    ai_scored: int = 0
    ai_error: str | None = None
    send_errors: list[str] = field(default_factory=list)
    finished: str = ""

    @property
    def total_new(self) -> int:
        return sum(s.new for s in self.sources)

    @property
    def total_matched(self) -> int:
        return sum(s.matched for s in self.sources)

    @property
    def total_duplicates(self) -> int:
        return sum(s.duplicates for s in self.sources)

    def summary_text(self) -> str:
        ok = [s for s in self.sources if not s.error and not s.skipped]
        bad = [s for s in self.sources if s.error]
        lines = [
            f"🔄 Dövrə bitdi: {len(ok)} mənbə oxundu, {len(bad)} xəta.",
            f"Yeni element: {self.total_new}, uyğun: {self.total_matched}, təkrar: {self.total_duplicates}.",
            f"Göndərildi: {self.sent}, xülasəyə: {self.queued}, aşağı bal: {self.filtered}, növbədə: {self.pending}.",
        ]
        if self.ai_scored:
            lines.append(f"🤖 Claude qiymətləndirdi: {self.ai_scored}")
        if self.ai_error:
            lines.append(f"⚠️ Claude: {self.ai_error} (lidlər balsız göndərilir)")
        base = [s.source_id for s in self.sources if s.baseline]
        if base:
            lines.append("İlk dəfə oxundu (başlanğıc nöqtəsi, göndərilmədi): " + ", ".join(base))
        expired = [s.source_id for s in self.sources if s.expired]
        if expired:
            lines.append("Müddəti bitdiyi üçün söndürülüb: " + ", ".join(expired))
        for s in bad:
            lines.append(f"⚠️ {s.source_id}: {s.error}")
        return "\n".join(lines)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


# ── iş vaxtı ayarları (Telegram əmrləri ilə dəyişdirilə bilər, .env-i üstələyir) ──

def effective_digest_time(settings: Settings, store: Store) -> str:
    v = store.get("digest_time")
    if v is None:
        return settings.digest_time
    return "" if v == "off" else v


def effective_min_score(settings: Settings, store: Store) -> int:
    v = store.get("ai_min_score")
    try:
        return min(10, max(1, int(v))) if v is not None else settings.ai_min_score
    except ValueError:
        return settings.ai_min_score


def local_now(settings: Settings, now_utc: datetime | None = None) -> datetime:
    now_utc = now_utc or datetime.now(timezone.utc)
    return (now_utc + timedelta(hours=settings.tz_offset_hours)).replace(tzinfo=None)


# ── əsas dövrə ──

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
    ai: LeadAI | None = None,
    today: date | None = None,
) -> CycleReport:
    """Bir tam dövrə: oxu → filtrlə → təkrarları at → (Claude) qiymətləndir → çatdır.

    - Mənbə ilk dəfə oxunursa bütün elementlər sükutla qeyd olunur (başlanğıc nöqtəsi).
    - seed_only=True → yalnız başlanğıc nöqtəsi; heç nə göndərilmir.
    - dry_run=True → göndəriləcək mesajlar ekrana yazılır; bazada heç nə 'göndərilib' sayılmır.
    """
    report = CycleReport(started=_now_iso())
    names = {s.id: s.name for s in sources}
    today = today or local_now(settings).date()

    for src in sources:
        rep = SourceReport(source_id=src.id, name=src.name)
        report.sources.append(rep)
        if only and src.id not in only:
            rep.skipped = True
            continue
        if src.expired(today):
            rep.skipped = rep.expired = True
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
            match = matcher.evaluate(it.text, src.category, src.require_geo, src.categories)
            rep.new += 1
            outcome = store.add_item(it, match, suppress=baseline)
            if match:
                rep.matched += 1
            if outcome == "duplicate":
                rep.duplicates += 1
        store.set_source_state(src.id, "ok", len(items), None)
        log.info("%s: %d element, %d yeni, %d uyğun, %d təkrar%s", src.id, rep.fetched, rep.new, rep.matched,
                 rep.duplicates, " (başlanğıc)" if baseline else "")

    if seed_only or not (send or dry_run):
        report.pending = store.pending_count()
        report.finished = _now_iso()
        return report

    if ai is not None:
        _score_pending(settings, store, ai, report)
    _deliver(settings, store, names, tg, chat_ids, report, ai_on=ai is not None, dry_run=dry_run)
    report.pending = store.pending_count()
    report.finished = _now_iso()
    return report


def _score_pending(settings: Settings, store: Store, ai: LeadAI, report: CycleReport) -> None:
    rows = store.unscored(settings.ai_max_per_cycle)
    if not rows:
        return
    payload = [{"id": r["id"], "source": r["source_id"], "title": r["title"], "summary": r["summary"] or ""}
               for r in rows]
    try:
        scores = ai.score(payload, negatives=store.recent_negative_titles())
    except AIError as exc:
        report.ai_error = str(exc)
        log.warning("Claude qiymətləndirməsi alınmadı: %s", exc)
        store.mark_ai_failed([r["id"] for r in rows])
        return
    missing = []
    for r in rows:
        s = scores.get(r["id"])
        if s is None:
            missing.append(r["id"])
            continue
        store.set_ai(r["id"], s.score, s.category, s.service, s.summary_az, s.reason_az)
        report.ai_scored += 1
    if missing:
        store.mark_ai_failed(missing)


def _deliver(settings, store, names, tg, chat_ids, report, ai_on: bool, dry_run: bool) -> None:
    min_score = effective_min_score(settings, store)
    digest_on = bool(effective_digest_time(settings, store))
    for row in store.pending(limit=1000):
        if ai_on and row["ai_done"] == 0:
            continue  # bu dövrədə qiymətləndirilmədi (limit) — növbəti dövrədə
        score = row["ai_score"] if row["ai_done"] == 1 else None
        if score is not None and score < min_score:
            if not dry_run:
                store.mark_filtered(row["id"])
            report.filtered += 1
            continue
        instant = not digest_on or (score is not None and score >= settings.instant_min_score)
        if not instant:
            if not dry_run:
                store.queue_digest(row["id"])
            report.queued += 1
            continue
        if report.sent >= settings.max_per_cycle:
            continue  # qalanı növbəti dövrədə
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
                tg.send_message(chat, text, reply_markup=lead_keyboard(row["id"], row["status"]))
                delivered = True
            except TelegramError as exc:
                report.send_errors.append(f"{chat}: {exc}")
                log.warning("Telegram göndərmə xətası (%s): %s", chat, exc)
        if delivered:
            store.mark_sent(row["id"])
            report.sent += 1
        else:
            break  # Telegram işləmirsə növbəni saxla


def maybe_send_digest(
    settings: Settings,
    store: Store,
    tg: TelegramClient | None,
    chat_ids: list[str],
    names: dict[str, str],
    now_utc: datetime | None = None,
    force: bool = False,
) -> bool:
    """Səhər xülasəsi vaxtı çatıbsa və bu gün göndərilməyibsə, göndərir."""
    digest_time = effective_digest_time(settings, store)
    if not force and not digest_time:
        return False
    if tg is None or not chat_ids:
        return False
    local = local_now(settings, now_utc)
    today = local.date().isoformat()
    if not force:
        hh, mm = (int(x) for x in digest_time.split(":"))
        if local.time() < dtime(hh, mm) or store.get("last_digest") == today:
            return False
    rows = store.digest_items()
    text = format_digest(rows, names, settings.digest_size, today)
    delivered = False
    for chat in chat_ids:
        try:
            tg.send_message(chat, text)
            delivered = True
        except TelegramError as exc:
            log.warning("xülasə göndərilmədi (%s): %s", chat, exc)
    if delivered:
        store.mark_digested([r["id"] for r in rows])
        store.set("last_digest", today)
    return delivered


def _plain(html_text: str) -> str:
    return re.sub(r"<[^>]+>", "", html_text).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")


def check_sources(settings: Settings, sources: list[Source], matcher: Matcher, only: set[str] | None = None,
                  on_result=None) -> list[dict]:
    """Hər mənbəni oxuyub nə qədər element və uyğunluq verdiyini qaytarır (bazaya yazmır).
    on_result(row) hər mənbə yoxlanan kimi çağırılır (ekranda dərhal göstərmək üçün)."""
    out = []
    today = local_now(settings).date()
    for src in sources:
        if only and src.id not in only:
            continue
        row = {"id": src.id, "name": src.name, "enabled": src.enabled and not src.expired(today),
               "count": 0, "matched": 0, "error": None, "sample": []}
        try:
            items = fetch_source(src, settings.user_agent, settings.request_timeout)
            row["count"] = len(items)
            for it in items:
                m = matcher.evaluate(it.text, src.category, src.require_geo, src.categories)
                if m:
                    row["matched"] += 1
                    if len(row["sample"]) < 3:
                        row["sample"].append(f"[{m.category}] {it.title[:90]}")
        except FetchError as exc:
            row["error"] = str(exc)
        except Exception as exc:
            row["error"] = f"{exc.__class__.__name__}: {exc}"
        out.append(row)
        if on_result is not None:
            on_result(row)
    return out
