from __future__ import annotations

import hashlib
import logging
import re
import time
from urllib.parse import urlparse

import requests

from .ai import AIError, LeadAI, template_draft
from .config import Settings, all_sources, load_profile, load_sources, parse_hhmm, parse_lead_types, ConfigError
from .filters import Matcher
from .formatting import (BUTTON_STATUS, CATEGORY_META, STATUS_LABELS, esc, format_row, format_short, lead_keyboard)
from .models import CATEGORIES, LEAD_TYPES, Source, normalize_tg_handle
from .runner import (check_sources, effective_digest_time, effective_health_url, effective_lead_types, effective_min_score,
                     maybe_send_digest, run_cycle)
from .sources import FetchError, fetch_source
from .storage import Store
from .telegram import TelegramClient, TelegramError
from .updater import RestartRequested, UpdateError, installed_sha, latest_sha, repo_and_branch, run_update
from .config import ROOT

log = logging.getLogger("leadsbot.bot")

HELP = """<b>Legal Leads Bot</b> — Azərbaycanla bağlı hüquqi yardım axtaranlar, iş elanları və tenderlər.

<b>Lidlər</b>
/last [n] — son uyğun lidlər · /l123 — lid kartı və düymələr
/pipeline — "Maraqlıdır" və "Əlaqə saxladım" lidləri
/draft 123 — məktub layihəsi

<b>Mənbələr</b>
/run — indi yoxla · /check — mənbələri test et
/sources — siyahı · /mute id · /unmute id
/addtg @kanal [job|individual|company|tender] — Telegram kanalı əlavə et
/deltg @kanal — kanalı sil
/addrss link [individual|company|job|tender|dispute] — RSS lenti əlavə et (Google Alerts)
/delrss id — RSS lentini sil
/health link — bot susanda xəbər verən keçid · /health off

<b>Filtr və çatdırılma</b>
/types individual job tender company — Telegram-a hansı növlər gəlsin (company səhər siqnallarıdır, dispute əlavə oluna bilər)
/ai — Claude statusu · /minscore 6 — minimum bal
/digest 09:00 · /digest off · /digest now — səhər xülasəsi
/keywords · /addkw söz · /delkw söz
/stats · /stop · /start · /ping

<b>Yeniləmə</b>
/update — yeni versiyanı GitHub-dan endir və yenidən başla
/version — cari versiya · /restart — botu yenidən başlat"""


class LeadsBot:
    def __init__(self, settings: Settings, store: Store, tg: TelegramClient, ai: LeadAI | None = None):
        self.settings = settings
        self.store = store
        self.tg = tg
        self.ai = ai
        self.config_sources: list[Source] = load_sources(settings.sources_file)
        self.profile = load_profile(settings.keywords_file)
        self.allowed = set(settings.require_chat_ids())
        self.offset: int | None = None
        self.cycling = False

    # ── helpers ──
    @property
    def sources(self) -> list[Source]:
        return all_sources(self.config_sources, self.store)

    def names(self) -> dict[str, str]:
        return {s.id: s.name for s in self.sources}

    def matcher(self) -> Matcher:
        return Matcher(self.profile, self.store.user_keywords())

    def active_chats(self) -> list[str]:
        return [c for c in self.settings.allowed_chat_ids if self.store.get(f"muted:{c}") != "1"]

    def reload_config(self) -> None:
        self.config_sources = load_sources(self.settings.sources_file)
        self.profile = load_profile(self.settings.keywords_file)

    def reply(self, chat_id: str, text: str, **kw) -> None:
        try:
            self.tg.send_message(chat_id, text, **kw)
        except TelegramError as exc:
            log.warning("cavab göndərilmədi (%s): %s", chat_id, exc)

    # ── main loop ──
    def run_forever(self, run_first: bool = True) -> None:
        interval = self.settings.fetch_interval_min * 60
        next_cycle = time.monotonic() if run_first else time.monotonic() + interval
        log.info("serve: %d mənbə, hər %d dəq, çatlar: %s, Claude: %s", len(self.sources),
                 self.settings.fetch_interval_min, ", ".join(self.settings.allowed_chat_ids),
                 self.settings.ai_model if self.ai else "söndürülüb")
        while True:
            if time.monotonic() >= next_cycle:
                try:
                    self.cycle(announce=False)
                except Exception:
                    log.exception("yoxlama dövrəsində xəta; növbəti dövrədə yenidən cəhd ediləcək")
                next_cycle = time.monotonic() + interval
            try:
                maybe_send_digest(self.settings, self.store, self.tg, self.active_chats(), self.names())
            except Exception:
                log.exception("xülasə xətası")
            wait = max(1, min(30, int(next_cycle - time.monotonic())))
            try:
                self.poll(wait)
            except TelegramError as exc:
                log.warning("getUpdates: %s", exc)
                time.sleep(5)

    def poll(self, timeout: int) -> None:
        """Telegram-dan yeni əmrləri oxuyur və icra edir."""
        for upd in self.tg.get_updates(self.offset, timeout=timeout):
            self.offset = upd["update_id"] + 1
            try:
                self.handle(upd)
            except RestartRequested:
                self._ack(self.offset)
                raise
            except Exception:  # bir əmr xətası botu öldürməsin
                log.exception("əmr emalında xəta")

    def _poll_during_cycle(self) -> None:
        """Dövrə bir neçə dəqiqə çəkir: bu vaxt düymələr və əmrlər gözləməsin."""
        try:
            self.poll(0)
        except TelegramError as exc:
            log.warning("getUpdates: %s", exc)

    def _ack(self, offset: int) -> None:
        """Telegram-a 'bu əmri oxudum' de ki, yenidən başladıqdan sonra təkrar icra olunmasın."""
        try:
            self.tg.get_updates(offset, timeout=0)
        except TelegramError as exc:
            log.warning("offset təsdiqlənmədi: %s", exc)

    def cycle(self, announce: bool, chat_id: str | None = None, only: set[str] | None = None) -> None:
        self.cycling = True
        try:
            report = run_cycle(
                self.settings, self.store, self.sources, self.matcher(), self.tg, self.active_chats(),
                send=True, only=only, ai=self.ai, between_sources=self._poll_during_cycle,
            )
        finally:
            self.cycling = False
        log.info(report.summary_text().replace("\n", " | "))
        if not only:
            self.ping_health()
        if announce and chat_id:
            self.reply(chat_id, esc(report.summary_text()))

    def ping_health(self) -> bool:
        """Nəzarət xidmətinə 'bot işləyir' siqnalı. Keçid yoxdursa və ya alınmasa, botu dayandırmır."""
        url = effective_health_url(self.settings, self.store)
        if not url:
            return False
        try:
            requests.get(url, timeout=10).raise_for_status()
            return True
        except requests.RequestException as exc:
            log.warning("nəzarət siqnalı göndərilmədi: %s", exc.__class__.__name__)
            return False

    def busy(self, chat_id: str) -> bool:
        if self.cycling:
            self.reply(chat_id, "⏳ Mənbələr hazırda yoxlanır. Bitəndən sonra yenidən yazın.")
        return self.cycling

    # ── updates ──
    def handle(self, update: dict) -> None:
        if "callback_query" in update:
            self.handle_callback(update["callback_query"])
            return
        msg = update.get("message") or update.get("edited_message")
        if not msg:
            return
        chat_id = str(msg.get("chat", {}).get("id"))
        text = (msg.get("text") or "").strip()
        if not text.startswith("/"):
            return
        if chat_id not in self.allowed:
            log.warning("icazəsiz çat: %s (%s)", chat_id, text[:40])
            self.reply(chat_id, "Bu bot şəxsidir. Çat ID-niz: <code>" + esc(chat_id) + "</code>")
            return
        parts = text.split(maxsplit=1)
        cmd = parts[0].split("@", 1)[0].lower()
        arg = parts[1].strip() if len(parts) > 1 else ""
        m = re.fullmatch(r"/l(\d+)", cmd)
        if m:
            self.cmd_lead(chat_id, m.group(1))
            return
        handler = {
            "/start": self.cmd_start, "/help": self.cmd_help, "/ping": self.cmd_ping,
            "/run": self.cmd_run, "/check": self.cmd_check, "/sources": self.cmd_sources,
            "/mute": self.cmd_mute, "/unmute": self.cmd_unmute,
            "/keywords": self.cmd_keywords, "/addkw": self.cmd_addkw, "/delkw": self.cmd_delkw,
            "/last": self.cmd_last, "/stats": self.cmd_stats, "/stop": self.cmd_stop,
            "/reload": self.cmd_reload, "/lead": self.cmd_lead, "/pipeline": self.cmd_pipeline,
            "/draft": self.cmd_draft, "/addtg": self.cmd_addtg, "/deltg": self.cmd_deltg,
            "/types": self.cmd_types, "/addrss": self.cmd_addrss, "/delrss": self.cmd_delrss, "/health": self.cmd_health,
            "/digest": self.cmd_digest, "/minscore": self.cmd_minscore, "/ai": self.cmd_ai,
            "/update": self.cmd_update, "/version": self.cmd_version, "/restart": self.cmd_restart,
        }.get(cmd)
        if handler is None:
            self.reply(chat_id, "Naməlum əmr. /help yazın.")
            return
        handler(chat_id, arg)

    def handle_callback(self, cq: dict) -> None:
        cq_id = cq.get("id", "")
        msg = cq.get("message") or {}
        chat_id = str((msg.get("chat") or {}).get("id"))
        data = cq.get("data") or ""
        if chat_id not in self.allowed:
            self._answer(cq_id, "İcazə yoxdur")
            return
        m = re.fullmatch(r"s:(\d+):([icxd])", data)
        if not m:
            self._answer(cq_id, "Köhnə düymə")
            return
        item_id, code = int(m.group(1)), m.group(2)
        row = self.store.get_item(item_id)
        if row is None:
            self._answer(cq_id, "Lid tapılmadı")
            return
        if code == "d":
            self._answer(cq_id, "✍️ Hazırlanır…")
            self.send_draft(chat_id, row, reply_to=msg.get("message_id"))
            return
        status = BUTTON_STATUS[code]
        if row["status"] == status:  # ikinci basış statusu sıfırlayır
            status = "new"
        self.store.set_status(item_id, status)
        self._answer(cq_id, "Qeyd edildi: " + STATUS_LABELS.get(status, status))
        if msg.get("message_id"):
            try:
                self.tg.edit_reply_markup(chat_id, msg["message_id"], lead_keyboard(item_id, status))
            except TelegramError as exc:
                log.warning("düymələr yenilənmədi: %s", exc)

    def _answer(self, cq_id: str, text: str) -> None:
        try:
            self.tg.answer_callback(cq_id, text)
        except TelegramError as exc:
            log.warning("callback cavabı: %s", exc)

    # ── lid əmrləri ──
    def _item_id(self, arg: str) -> int | None:
        m = re.search(r"\d+", arg or "")
        return int(m.group()) if m else None

    def cmd_lead(self, chat_id: str, arg: str) -> None:
        item_id = self._item_id(arg)
        row = self.store.get_item(item_id) if item_id else None
        if row is None:
            self.reply(chat_id, "Lid tapılmadı. Nümunə: /l123")
            return
        self.reply(chat_id, format_row(row, self.names().get(row["source_id"], row["source_id"])),
                   reply_markup=lead_keyboard(row["id"], row["status"]))

    def cmd_draft(self, chat_id: str, arg: str) -> None:
        item_id = self._item_id(arg)
        row = self.store.get_item(item_id) if item_id else None
        if row is None:
            self.reply(chat_id, "İstifadə: /draft 123")
            return
        self.send_draft(chat_id, row)

    def send_draft(self, chat_id: str, row, reply_to: int | None = None) -> None:
        category = row["ai_category"] or row["category"]
        source_note = ""
        if self.ai is not None:
            try:
                text = self.ai.draft({
                    "category": category, "title": row["title"], "summary": row["ai_summary"] or row["summary"],
                    "origin": row["origin"], "link": row["link"], "service": row["ai_service"],
                })
                source_note = "Claude"
            except AIError as exc:
                log.warning("məktub layihəsi alınmadı: %s", exc)
                text = template_draft(category, row["title"])
                source_note = "şablon (Claude xətası)"
        else:
            text = template_draft(category, row["title"])
            source_note = "şablon"
        self.reply(
            chat_id,
            f"✍️ <b>Məktub layihəsi</b> · {esc(source_note)}\nYoxlayıb, düzəldib özünüz göndərin.\n<pre>{esc(text)}</pre>",
            reply_to=reply_to,
        )

    def cmd_pipeline(self, chat_id: str, arg: str) -> None:
        names = self.names()
        lines = ["<b>İş axını</b>"]
        for status in ("interested", "contacted"):
            rows = self.store.by_status((status,), limit=25)
            lines.append(f"\n{STATUS_LABELS[status]} — {len(rows)}")
            lines += [format_short(r, names.get(r["source_id"], r["source_id"])) for r in rows]
        if len(lines) == 3 and all("— 0" in ln for ln in lines[1:]):
            lines.append("\nHələ boşdur. Lidlərin altındakı ⭐ və 📞 düymələrindən istifadə edin.")
        self.reply(chat_id, "\n".join(lines))

    def cmd_last(self, chat_id: str, arg: str) -> None:
        try:
            n = max(1, min(30, int(arg))) if arg else 10
        except ValueError:
            n = 10
        rows = self.store.recent_matches(n)
        if not rows:
            self.reply(chat_id, "Hələ uyğun element yoxdur. /run ilə yoxlayın.")
            return
        names = self.names()
        lines = [f"<b>Son {len(rows)} uyğun lid</b>"]
        lines += [format_short(r, names.get(r["source_id"], r["source_id"])) for r in rows]
        self.reply(chat_id, "\n".join(lines))

    # ── mənbələr ──
    def cmd_start(self, chat_id: str, arg: str) -> None:
        self.store.delete(f"muted:{chat_id}")
        self.reply(chat_id, "✅ Bildirişlər aktivdir.\n\n" + HELP)

    def cmd_help(self, chat_id: str, arg: str) -> None:
        self.reply(chat_id, HELP)

    def cmd_ping(self, chat_id: str, arg: str) -> None:
        st = self.store.stats()
        self.reply(chat_id, f"🏓 İşləyirəm. Bazada {st['items']} element, {st['pending']} növbədə, "
                            f"{st['digest_queue']} xülasə növbəsində.")

    def cmd_stop(self, chat_id: str, arg: str) -> None:
        self.store.set(f"muted:{chat_id}", "1")
        self.reply(chat_id, "🔕 Bildirişlər dayandırıldı. Davam etmək üçün /start.")

    def cmd_run(self, chat_id: str, arg: str) -> None:
        if self.busy(chat_id):
            return
        only = {a.strip() for a in arg.split(",") if a.strip()} or None
        self.reply(chat_id, "⏳ Mənbələr yoxlanır…")
        self.cycle(announce=True, chat_id=chat_id, only=only)

    def cmd_check(self, chat_id: str, arg: str) -> None:
        if self.busy(chat_id):
            return
        only = {a.strip() for a in arg.split(",") if a.strip()} or None
        self.reply(chat_id, "⏳ Mənbələr test edilir (bazaya yazılmır)…")
        rows = check_sources(self.settings, self.sources, self.matcher(), only)
        lines = ["<b>Mənbə testi</b>"]
        for r in rows:
            if r["error"]:
                lines.append(f"❌ <code>{esc(r['id'])}</code> — {esc(r['error'][:120])}")
            else:
                lines.append(f"✅ <code>{esc(r['id'])}</code> — {r['count']} element, {r['matched']} uyğun")
                for s in r["sample"]:
                    lines.append(f"    · {esc(s)}")
        self.reply(chat_id, "\n".join(lines))

    def cmd_sources(self, chat_id: str, arg: str) -> None:
        states = self.store.source_states()
        lines = ["<b>Mənbələr</b> (/mute id, /unmute id)"]
        for s in self.sources:
            enabled = self.store.source_enabled(s.id, s.enabled)
            st = states.get(s.id)
            status = ""
            if st is not None and st["last_run"]:
                status = f" · son: {st['last_status']} {st['last_count'] or 0} el. ({(st['last_run'] or '')[:16]})"
                if st["last_error"]:
                    status += f" ⚠️ {st['last_error'][:60]}"
            flag = "🟢" if enabled else "⚪️"
            extra = f" · {s.disable_after}-dək" if s.disable_after else ""
            lines.append(f"{flag} <code>{esc(s.id)}</code> — {esc(s.name)}{esc(extra)}{esc(status)}")
        self.reply(chat_id, "\n".join(lines))

    def _toggle(self, chat_id: str, arg: str, enabled: bool) -> None:
        if arg not in {s.id for s in self.sources}:
            self.reply(chat_id, "Mənbə id-si lazımdır. Siyahı: /sources")
            return
        self.store.set_source_enabled(arg, enabled)
        self.reply(chat_id, f"{'🟢 Yandırıldı' if enabled else '⚪️ Söndürüldü'}: <code>{esc(arg)}</code>")

    def cmd_mute(self, chat_id: str, arg: str) -> None:
        self._toggle(chat_id, arg, False)

    def cmd_unmute(self, chat_id: str, arg: str) -> None:
        self._toggle(chat_id, arg, True)

    def cmd_addtg(self, chat_id: str, arg: str) -> None:
        parts = arg.split()
        handle = normalize_tg_handle(parts[0]) if parts else None
        category = (parts[1].lower() if len(parts) > 1 else "job")
        if not handle or category not in CATEGORIES:
            self.reply(chat_id, "İstifadə: /addtg @kanal [job|individual|company|tender|dispute|other]\n"
                                "Nümunə: /addtg https://t.me/kanal_adi job")
            return
        src = Source(id=f"tg_{handle.lower()}", name=f"Telegram @{handle}", type="tg_channel", channel=handle,
                     category=category, categories=None if category == "other" else [category],
                     require_geo=False, user_added=True)
        if src.id in {s.id for s in self.config_sources}:
            self.reply(chat_id, "Bu kanal artıq konfiqurasiyadadır.")
            return
        try:
            items = fetch_source(src, self.settings.user_agent, self.settings.request_timeout)
        except FetchError as exc:
            self.reply(chat_id, f"❌ @{esc(handle)} oxunmadı: {esc(str(exc))}")
            return
        if not items:
            self.reply(chat_id, f"❌ @{esc(handle)} kanalında açıq post görünmür. Kanal gizli ola bilər "
                                "və ya önizləməsi bağlıdır. Yalnız ictimai kanallar işləyir.")
            return
        if items[0].origin and not items[0].origin.startswith("@"):
            src.name = f"Telegram: {items[0].origin}"
        added = self.store.add_user_source(src)
        matched = sum(1 for it in items if self.matcher().evaluate(it.text, src.category, False, src.categories))
        self.reply(chat_id, ("➕ Əlavə edildi" if added else "Artıq var") +
                   f": <code>{esc(src.id)}</code> — {len(items)} son post, {matched} uyğun ({esc(category)}).\n"
                   "İlk yoxlamada mövcud postlar yalnız yadda saxlanılır, sonra yeniləri gələcək.")

    def cmd_deltg(self, chat_id: str, arg: str) -> None:
        handle = normalize_tg_handle(arg.split()[0]) if arg.strip() else None
        if not handle:
            self.reply(chat_id, "İstifadə: /deltg @kanal")
            return
        removed = self.store.remove_user_source(f"tg_{handle.lower()}")
        self.reply(chat_id, ("➖ Silindi: @" if removed else "Tapılmadı: @") + esc(handle))

    @staticmethod
    def _rss_id(url: str) -> str:
        return "rss_" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]

    def cmd_addrss(self, chat_id: str, arg: str) -> None:
        parts = arg.split()
        url = parts[0] if parts else ""
        category = parts[1].lower() if len(parts) > 1 else "individual"
        if not url.lower().startswith(("https://", "http://")) or category not in CATEGORIES:
            self.reply(chat_id, "İstifadə: /addrss link [individual|company|job|tender|dispute|other]\n"
                                "Google Alerts-də çatdırılma üçün «RSS feed» seçin və linki bura yapışdırın.")
            return
        alerts = "google." in url.lower() and "/alerts/" in url.lower()
        src = Source(id=self._rss_id(url), name="Google Alerts" if alerts else f"RSS: {urlparse(url).netloc}", type="rss",
                     url=url, category=category, categories=None if category == "other" else [category],
                     require_geo=False, expect_empty=True, user_added=True)
        try:
            items = fetch_source(src, self.settings.user_agent, self.settings.request_timeout)
        except FetchError as exc:
            self.reply(chat_id, f"❌ Lent oxunmadı: {esc(str(exc))}")
            return
        added = self.store.add_user_source(src)
        self.reply(chat_id, ("➕ Əlavə edildi" if added else "Artıq var") +
                   f": <code>{esc(src.id)}</code> — hazırda {len(items)} element ({esc(category)}).\n"
                   "Mövcud elementlər göndərilmir, yeniləri gələcək. Silmək: /delrss " + esc(src.id))

    def cmd_delrss(self, chat_id: str, arg: str) -> None:
        a = arg.strip()
        if not a:
            self.reply(chat_id, "İstifadə: /delrss rss_ab12cd34")
            return
        sid = self._rss_id(a) if a.lower().startswith("http") else a
        removed = sid.startswith("rss_") and self.store.remove_user_source(sid)
        self.reply(chat_id, ("➖ Silindi: " if removed else "Tapılmadı: ") + esc(sid))

    def cmd_health(self, chat_id: str, arg: str) -> None:
        a = arg.strip()
        if a.lower() == "off":
            self.store.set("health_url", "")
            self.reply(chat_id, "Nəzarət siqnalı söndürüldü.")
            return
        if a:
            if not a.lower().startswith("https://"):
                self.reply(chat_id, "İstifadə: /health https://hc-ping.com/... · /health off")
                return
            self.store.set("health_url", a)
            ok = self.ping_health()
            self.reply(chat_id, "✅ Keçid yadda saxlandı, ilk siqnal göndərildi." if ok
                       else "⚠️ Keçid yadda saxlandı, amma siqnal alınmadı. Linki yoxlayın.")
            return
        on = bool(effective_health_url(self.settings, self.store))
        self.reply(chat_id, "Nəzarət siqnalı aktivdir." if on else "Nəzarət siqnalı qoşulmayıb. /health https://hc-ping.com/...")

    # ── filtr və çatdırılma ──
    def cmd_types(self, chat_id: str, arg: str) -> None:
        if arg.strip():
            try:
                types = parse_lead_types(arg)
            except ConfigError:
                self.reply(chat_id, "İstifadə: /types individual job tender company dispute · /types all")
                return
            self.store.set("lead_types", ",".join(types))
        current = effective_lead_types(self.settings, self.store)
        names = ", ".join(CATEGORY_META[t][1] for t in LEAD_TYPES if t in current)
        self.reply(chat_id, f"Telegram-a gələnlər: {esc(names)}.\nDəyişmək: /types individual job tender")

    def cmd_keywords(self, chat_id: str, arg: str) -> None:
        kws = self.store.user_keywords()
        base = sum(len(v) for v in self.profile.categories.values())
        text = f"Konfiqurasiyada {base} kateqoriya sözü, {len(self.profile.geo)} geo söz var.\n"
        text += "Əlavə açar sözlər: " + (", ".join(esc(k) for k in kws) if kws else "yoxdur") + "\n/addkw söz · /delkw söz"
        self.reply(chat_id, text)

    def cmd_addkw(self, chat_id: str, arg: str) -> None:
        if not arg:
            self.reply(chat_id, "İstifadə: /addkw residence permit")
            return
        added = self.store.add_keyword(arg)
        self.reply(chat_id, ("➕ Əlavə edildi: " if added else "Artıq var: ") + esc(arg))

    def cmd_delkw(self, chat_id: str, arg: str) -> None:
        if not arg:
            self.reply(chat_id, "İstifadə: /delkw söz")
            return
        removed = self.store.remove_keyword(arg)
        self.reply(chat_id, ("➖ Silindi: " if removed else "Tapılmadı: ") + esc(arg))

    def cmd_digest(self, chat_id: str, arg: str) -> None:
        a = arg.strip().lower()
        if a == "now":
            sent = maybe_send_digest(self.settings, self.store, self.tg, [chat_id], self.names(), force=True)
            if not sent:
                self.reply(chat_id, "Xülasə göndərilmədi.")
            return
        if a:
            try:
                value = parse_hhmm(a)
            except ConfigError:
                self.reply(chat_id, "İstifadə: /digest 09:00 · /digest off · /digest now")
                return
            self.store.set("digest_time", value or "off")
            if value:
                self.store.delete("last_digest")
        current = effective_digest_time(self.settings, self.store)
        if current:
            note = (f" Bal {self.settings.instant_min_score}+ olan lidlər dərhal gəlir." if self.ai
                    else " Claude söndürülüb, ona görə bütün lidlər xülasəyə düşür.")
            self.reply(chat_id, f"☀️ Səhər xülasəsi: hər gün {current} (Bakı vaxtı).{note}")
        else:
            self.reply(chat_id, "Səhər xülasəsi söndürülüb: bütün lidlər dərhal gəlir. Yandırmaq: /digest 09:00")

    def cmd_minscore(self, chat_id: str, arg: str) -> None:
        if arg.strip():
            try:
                v = int(arg.strip())
                if not 1 <= v <= 10:
                    raise ValueError
            except ValueError:
                self.reply(chat_id, "İstifadə: /minscore 6  (1–10)")
                return
            self.store.set("ai_min_score", str(v))
        v = effective_min_score(self.settings, self.store)
        tail = "" if self.ai else " Claude söndürülüb, ona görə bal hələ tətbiq olunmur."
        self.reply(chat_id, f"Minimum bal: {v}/10. Bundan aşağı lidlər göndərilmir.{tail}")

    def cmd_ai(self, chat_id: str, arg: str) -> None:
        if self.ai is None:
            self.reply(chat_id, "🤖 Claude söndürülüb. Yandırmaq üçün .env faylına ANTHROPIC_API_KEY yazın "
                                "(platform.claude.com → API Keys) və botu yenidən başladın. "
                                "Windows-da: setup.bat → açarı yapışdırın.")
            return
        st = self.store.stats()
        self.reply(chat_id, f"🤖 Claude aktivdir\nModel: <code>{esc(self.settings.ai_model)}</code>\n"
                            f"Minimum bal: {effective_min_score(self.settings, self.store)}/10 · dərhal: "
                            f"{self.settings.instant_min_score}+\nSüzülmüş (aşağı bal): {st['low']}")

    def cmd_stats(self, chat_id: str, arg: str) -> None:
        st = self.store.stats()
        cats = ", ".join(f"{k or 'other'}: {v}" for k, v in sorted(st["by_category"].items())) or "—"
        stat = ", ".join(f"{STATUS_LABELS.get(k, k)}: {v}" for k, v in sorted(st["by_status"].items()) if k) or "—"
        self.reply(
            chat_id,
            f"📊 Element: {st['items']} · uyğun: {st['matched']} · göndərilib: {st['sent']} · növbədə: {st['pending']}\n"
            f"Xülasə növbəsi: {st['digest_queue']} · təkrar: {st['duplicates']} · aşağı bal: {st['low']}\n"
            f"Kateqoriyalar: {esc(cats)}\nStatuslar: {esc(stat)}\n"
            f"Mənbə sayı: {len(self.sources)} · interval: {self.settings.fetch_interval_min} dəq",
        )

    def cmd_reload(self, chat_id: str, arg: str) -> None:
        try:
            self.reload_config()
            self.reply(chat_id, f"♻️ Konfiqurasiya yenidən yükləndi: {len(self.sources)} mənbə.")
        except Exception as exc:
            self.reply(chat_id, "Konfiqurasiya xətası: " + esc(str(exc)))

    # ── yeniləmə ──
    def cmd_update(self, chat_id: str, arg: str) -> None:
        self.reply(chat_id, "⏳ GitHub-da yeni versiya yoxlanır…")
        try:
            result = run_update(ROOT, force=arg.strip().lower() == "force")
        except UpdateError as exc:
            self.reply(chat_id, f"❌ Yeniləmə alınmadı: {esc(str(exc))}. Bot köhnə versiya ilə işləməyə davam edir.")
            return
        if not result.updated:
            self.reply(chat_id, "✅ " + esc(result.message))
            return
        self.reply(chat_id, "✅ " + esc(result.message) + "\n🔄 Yenidən başlayıram, 10–20 saniyə sonra /ping yazın.")
        raise RestartRequested()

    def cmd_restart(self, chat_id: str, arg: str) -> None:
        self.reply(chat_id, "🔄 Yenidən başlayıram, 10–20 saniyə sonra /ping yazın.")
        raise RestartRequested()

    def cmd_version(self, chat_id: str, arg: str) -> None:
        repo, branch = repo_and_branch()
        current = installed_sha(ROOT)
        latest = latest_sha(requests.Session(), repo, branch)
        lines = [f"📦 Cari versiya: <code>{esc(current[:7] or 'naməlum')}</code>"]
        if latest:
            lines.append(f"GitHub-da son: <code>{esc(latest[:7])}</code>")
            lines.append("✅ Son versiyadır." if latest == current else "🆕 Yeni versiya var: /update")
        else:
            lines.append("GitHub yoxlanmadı.")
        self.reply(chat_id, "\n".join(lines))
