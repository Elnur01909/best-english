from __future__ import annotations

import logging
import time

from .config import Settings, load_profile, load_sources
from .filters import Matcher
from .formatting import esc, format_short
from .models import Source
from .runner import check_sources, run_cycle
from .storage import Store
from .telegram import TelegramClient, TelegramError

log = logging.getLogger("leadsbot.bot")

HELP = """<b>Legal Leads Bot</b> — Azərbaycanda ingilisdilli hüquqi xidmət lidləri və iş elanları.

Əmrlər:
/run — mənbələri indi yoxla
/check — hər mənbənin işlədiyini test et (bazaya yazmır)
/sources — mənbələrin siyahısı və son statusu
/mute &lt;id&gt; · /unmute &lt;id&gt; — mənbəni söndür / yandır
/keywords — əlavə açar sözlər
/addkw &lt;söz&gt; · /delkw &lt;söz&gt; — əlavə açar söz əlavə et / sil
/last [n] — son uyğun gələn n element (defolt 10)
/stats — statistika
/stop · /start — bildirişləri dayandır / davam et
/ping — bot işləyir?"""


class LeadsBot:
    def __init__(self, settings: Settings, store: Store, tg: TelegramClient):
        self.settings = settings
        self.store = store
        self.tg = tg
        self.sources: list[Source] = load_sources(settings.sources_file)
        self.profile = load_profile(settings.keywords_file)
        self.allowed = set(settings.require_chat_ids())

    # ── helpers ──
    def matcher(self) -> Matcher:
        return Matcher(self.profile, self.store.user_keywords())

    def active_chats(self) -> list[str]:
        return [c for c in self.settings.allowed_chat_ids if self.store.get(f"muted:{c}") != "1"]

    def reload_config(self) -> None:
        self.sources = load_sources(self.settings.sources_file)
        self.profile = load_profile(self.settings.keywords_file)

    def reply(self, chat_id: str, text: str) -> None:
        try:
            self.tg.send_message(chat_id, text)
        except TelegramError as exc:
            log.warning("cavab göndərilmədi (%s): %s", chat_id, exc)

    # ── main loop ──
    def run_forever(self, run_first: bool = True) -> None:
        interval = self.settings.fetch_interval_min * 60
        next_cycle = time.monotonic() if run_first else time.monotonic() + interval
        offset: int | None = None
        log.info("serve: %d mənbə, hər %d dəq, çatlar: %s", len(self.sources), self.settings.fetch_interval_min,
                 ", ".join(self.settings.allowed_chat_ids))
        while True:
            now = time.monotonic()
            if now >= next_cycle:
                try:
                    self.cycle(announce=False)
                except Exception:
                    log.exception("yoxlama dövrəsində xəta; növbəti dövrədə yenidən cəhd ediləcək")
                next_cycle = time.monotonic() + interval
            wait = max(1, min(30, int(next_cycle - time.monotonic())))
            try:
                updates = self.tg.get_updates(offset, timeout=wait)
            except TelegramError as exc:
                log.warning("getUpdates: %s", exc)
                time.sleep(5)
                continue
            for upd in updates:
                offset = upd["update_id"] + 1
                try:
                    self.handle(upd)
                except Exception:  # bir əmr xətası botu öldürməsin
                    log.exception("əmr emalında xəta")

    def cycle(self, announce: bool, chat_id: str | None = None, only: set[str] | None = None) -> None:
        report = run_cycle(
            self.settings, self.store, self.sources, self.matcher(), self.tg, self.active_chats(),
            send=True, only=only,
        )
        log.info(report.summary_text().replace("\n", " | "))
        if announce and chat_id:
            self.reply(chat_id, esc(report.summary_text()))

    # ── commands ──
    def handle(self, update: dict) -> None:
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
        handler = {
            "/start": self.cmd_start, "/help": self.cmd_help, "/ping": self.cmd_ping,
            "/run": self.cmd_run, "/check": self.cmd_check, "/sources": self.cmd_sources,
            "/mute": self.cmd_mute, "/unmute": self.cmd_unmute,
            "/keywords": self.cmd_keywords, "/addkw": self.cmd_addkw, "/delkw": self.cmd_delkw,
            "/last": self.cmd_last, "/stats": self.cmd_stats, "/stop": self.cmd_stop,
            "/reload": self.cmd_reload,
        }.get(cmd)
        if handler is None:
            self.reply(chat_id, "Naməlum əmr. /help yazın.")
            return
        handler(chat_id, arg)

    def cmd_start(self, chat_id: str, arg: str) -> None:
        self.store.delete(f"muted:{chat_id}")
        self.reply(chat_id, "✅ Bildirişlər aktivdir.\n\n" + HELP)

    def cmd_help(self, chat_id: str, arg: str) -> None:
        self.reply(chat_id, HELP)

    def cmd_ping(self, chat_id: str, arg: str) -> None:
        st = self.store.stats()
        self.reply(chat_id, f"🏓 İşləyirəm. Bazada {st['items']} element, {st['pending']} növbədə.")

    def cmd_stop(self, chat_id: str, arg: str) -> None:
        self.store.set(f"muted:{chat_id}", "1")
        self.reply(chat_id, "🔕 Bildirişlər dayandırıldı. Davam etmək üçün /start.")

    def cmd_run(self, chat_id: str, arg: str) -> None:
        only = {a.strip() for a in arg.split(",") if a.strip()} or None
        self.reply(chat_id, "⏳ Mənbələr yoxlanır…")
        self.cycle(announce=True, chat_id=chat_id, only=only)

    def cmd_check(self, chat_id: str, arg: str) -> None:
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
            lines.append(f"{flag} <code>{esc(s.id)}</code> — {esc(s.name)}{esc(status)}")
        self.reply(chat_id, "\n".join(lines))

    def _toggle(self, chat_id: str, arg: str, enabled: bool) -> None:
        ids = {s.id for s in self.sources}
        if arg not in ids:
            self.reply(chat_id, "Mənbə id-si lazımdır. Siyahı: /sources")
            return
        self.store.set_source_enabled(arg, enabled)
        self.reply(chat_id, f"{'🟢 Yandırıldı' if enabled else '⚪️ Söndürüldü'}: <code>{esc(arg)}</code>")

    def cmd_mute(self, chat_id: str, arg: str) -> None:
        self._toggle(chat_id, arg, False)

    def cmd_unmute(self, chat_id: str, arg: str) -> None:
        self._toggle(chat_id, arg, True)

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

    def cmd_last(self, chat_id: str, arg: str) -> None:
        try:
            n = max(1, min(30, int(arg))) if arg else 10
        except ValueError:
            n = 10
        rows = self.store.recent_matches(n)
        if not rows:
            self.reply(chat_id, "Hələ uyğun element yoxdur. /run ilə yoxlayın.")
            return
        names = {s.id: s.name for s in self.sources}
        lines = [f"<b>Son {len(rows)} uyğun element</b>"]
        lines += [format_short(r, names.get(r["source_id"], r["source_id"])) for r in rows]
        self.reply(chat_id, "\n".join(lines))

    def cmd_stats(self, chat_id: str, arg: str) -> None:
        st = self.store.stats()
        cats = ", ".join(f"{k or 'other'}: {v}" for k, v in sorted(st["by_category"].items())) or "—"
        self.reply(
            chat_id,
            f"📊 Element: {st['items']} · uyğun: {st['matched']} · göndərilib: {st['sent']} · növbədə: {st['pending']}\n"
            f"Kateqoriyalar: {esc(cats)}\nMənbə sayı: {len(self.sources)} · interval: {self.settings.fetch_interval_min} dəq",
        )

    def cmd_reload(self, chat_id: str, arg: str) -> None:
        try:
            self.reload_config()
            self.reply(chat_id, f"♻️ Konfiqurasiya yenidən yükləndi: {len(self.sources)} mənbə.")
        except Exception as exc:
            self.reply(chat_id, "Konfiqurasiya xətası: " + esc(str(exc)))
