from __future__ import annotations

import argparse
import logging
import sys

from pathlib import Path

from .ai import make_ai
from .config import ROOT, ConfigError, all_sources, load_profile, load_settings, load_sources
from .filters import Matcher
from .lock import SingleInstance
from .manual import MANUAL_SOURCES, add_manual_leads, load_leads_file
from .runner import check_sources, maybe_send_digest, run_cycle
from .storage import Store
from .telegram import TelegramClient, TelegramError
from .updater import RESTART_EXIT_CODE, RestartRequested, UpdateError, run_update


LOG_FILE = ROOT / "data" / "leadsbot.log"


def _logging(verbose: bool) -> None:
    handlers: list[logging.Handler] = [logging.StreamHandler()]
    try:  # xətaları fayla da yaz ki, pəncərə bağlansa belə səbəb görünsün
        from logging.handlers import RotatingFileHandler
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(RotatingFileHandler(LOG_FILE, maxBytes=1_000_000, backupCount=2, encoding="utf-8"))
    except OSError:
        pass
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
    )
    # urllib3 DEBUG logları sorğu URL-ini yazır; Telegram URL-ində token var — heç vaxt göstərmə
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def cmd_fetch(args, settings) -> int:
    store = Store(settings.db_path)
    sources = all_sources(load_sources(settings.sources_file), store)
    matcher = Matcher(load_profile(settings.keywords_file), store.user_keywords())
    tg, chats = None, []
    if not args.dry_run and not args.seed:
        tg = TelegramClient(settings.require_token(), timeout=settings.request_timeout)
        chats = [c for c in settings.require_chat_ids() if store.get(f"muted:{c}") != "1"]
    only = set(args.only.split(",")) if args.only else None
    ai = None if (args.seed or args.no_ai) else make_ai(settings)
    report = run_cycle(settings, store, sources, matcher, tg, chats,
                       send=not args.dry_run, seed_only=args.seed, dry_run=args.dry_run, only=only, ai=ai)
    print(report.summary_text())
    if tg is not None and maybe_send_digest(settings, store, tg, chats, {**MANUAL_SOURCES, **{s.id: s.name for s in sources}}):
        print("☀️ Səhər xülasəsi göndərildi.")
    for err in report.send_errors:
        print("Telegram:", err)
    return 1 if report.send_errors else 0


def disable_quick_edit() -> bool:
    """Windows pəncərəsinə klik edəndə ("Select") konsol yazını dayandırır və bot donur. Bunu söndürür.
    Konsol yoxdursa və ya Windows deyilsə heç nə etmir. Söndürüldüsə True qaytarır."""
    if not sys.platform.startswith("win"):
        return False
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.GetStdHandle(-10)  # STD_INPUT_HANDLE
        mode = ctypes.c_uint32()
        if not kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            return False
        new_mode = (mode.value | 0x0080) & ~0x0040  # ENABLE_EXTENDED_FLAGS açıq, ENABLE_QUICK_EDIT_MODE söndürülür
        return bool(kernel32.SetConsoleMode(handle, new_mode))
    except Exception:  # konsol ayarı alınmasa da bot işləməlidir
        return False


def cmd_serve(args, settings) -> int:
    from .bot import LeadsBot
    lock = SingleInstance(settings.db_path.parent / "serve.lock")
    if not lock.acquire():
        print("Bot artıq işləyir (başqa pəncərədə və ya avtomatik açılışla). İkinci nüsxə açılmadı.")
        return 3
    if disable_quick_edit():
        print("Pəncərəyə klik etmək botu artıq dayandırmır.")
    try:
        store = Store(settings.db_path)
        tg = TelegramClient(settings.require_token(), timeout=settings.request_timeout)
        me = tg.get_me()
        ai = make_ai(settings)
        print(f"Bot: @{me.get('username')} — serve rejimi, hər {settings.fetch_interval_min} dəq. "
              f"Claude: {settings.ai_model if ai else 'söndürülüb'}. Ctrl+C ilə dayandırın.")
        bot = LeadsBot(settings, store, tg, ai=ai)
        try:
            bot.run_forever(run_first=not args.no_first_run)
        except KeyboardInterrupt:
            print("\nDayandırıldı.")
        except RestartRequested:
            print("\nYenidən başlayıram…")
            return RESTART_EXIT_CODE
        return 0
    finally:
        lock.release()


def cmd_check(args, settings) -> int:
    store = Store(settings.db_path)
    sources = all_sources(load_sources(settings.sources_file), store)
    matcher = Matcher(load_profile(settings.keywords_file), store.user_keywords())
    only = set(args.only.split(",")) if args.only else None
    total = len([s for s in sources if not only or s.id in only])
    print(f"{total} mənbə yoxlanır, bu 1-2 dəqiqə çəkə bilər. Nəticələr hazır olduqca görünəcək.\n", flush=True)

    def show(r: dict) -> None:
        flag = "OFF " if not r["enabled"] else "    "
        if r["error"]:
            print(f"❌ {flag}{r['id']:<24} {r['error']}", flush=True)
        else:
            print(f"✅ {flag}{r['id']:<24} {r['count']:>3} element, {r['matched']:>3} uyğun", flush=True)
            for sample in r["sample"]:
                print(f"       · {sample}", flush=True)

    rows = check_sources(settings, sources, matcher, only, on_result=show)
    bad = sum(1 for r in rows if r["error"])
    print(f"\n{len(rows) - bad}/{len(rows)} mənbə işləyir. OFF = söndürülmüş mənbə (yalnız test üçün yoxlanıldı).")
    return 0


def cmd_sources(args, settings) -> int:
    for s in all_sources(load_sources(settings.sources_file), Store(settings.db_path)):
        print(f"{'ON ' if s.enabled else 'OFF'} {s.id:<24} [{s.category:<10}] {s.type:<14} {s.name}")
        if s.note:
            print(f"    {s.note}")
    return 0


def cmd_send_test(args, settings) -> int:
    tg = TelegramClient(settings.require_token(), timeout=settings.request_timeout)
    me = tg.get_me()
    for chat in settings.require_chat_ids():
        tg.send_message(chat, f"✅ <b>Legal Leads Bot</b> (@{me.get('username')}) işləyir. Test mesajı.")
        print(f"Göndərildi → {chat}")
    return 0


def cmd_chatid(args, settings) -> int:
    tg = TelegramClient(settings.require_token(), timeout=settings.request_timeout)
    updates = tg.get_updates(None, timeout=1)
    if not updates:
        print("Hələ mesaj yoxdur. Telegram-da bota /start yazın və bu əmri yenidən işə salın.")
        return 1
    seen = {}
    for u in updates:
        msg = u.get("message") or u.get("edited_message") or {}
        chat = msg.get("chat") or {}
        if chat.get("id") is not None:
            who = chat.get("username") or chat.get("title") or f"{chat.get('first_name', '')} {chat.get('last_name', '')}".strip()
            seen[chat["id"]] = who
    for cid, who in seen.items():
        print(f"TELEGRAM_CHAT_ID={cid}    ({who})")
    return 0


def cmd_update(args, settings) -> int:
    print("GitHub-da yeni versiya yoxlanır…", flush=True)
    try:
        result = run_update(ROOT, force=args.force)
    except UpdateError as exc:
        print(f"Yeniləmə alınmadı: {exc}")
        return 1
    print(result.message)
    if result.updated:
        probe = SingleInstance(settings.db_path.parent / "serve.lock")
        if probe.acquire():
            probe.release()
            print("Botu işə salmaq üçün: start.bat")
        else:
            print("Bot hazırda işləyir: Telegram-da /restart yazın və ya pəncərəni bağlayıb start.bat-ı açın.")
    return 0


ADD_LABELS = {
    "pending": "✅ növbəyə qoyuldu",
    "known": "↩️ artıq var, yenidən göndərilmir",
    "duplicate": "↩️ eyni başlıqlı yazı artıq var",
    "invalid": "❌ link (http...) və başlıq lazımdır",
}


def cmd_add(args, settings) -> int:
    if args.source not in MANUAL_SOURCES:
        print(f"Mənbə yalnız bunlar ola bilər: {', '.join(MANUAL_SOURCES)}")
        return 2
    if args.file:
        try:
            leads = load_leads_file(Path(args.file))
        except (OSError, ValueError) as exc:
            print(f"Fayl oxunmadı: {exc}")
            return 2
    elif args.link and args.title:
        leads = [{"link": args.link, "title": args.title, "text": args.text, "who": args.who, "date": args.date}]
    else:
        print("--link və --title (və ya --file) lazımdır.")
        return 2
    results = add_manual_leads(Store(settings.db_path), args.source, leads)
    for outcome, title in results:
        print(f"{ADD_LABELS.get(outcome, outcome)}: {title[:90]}")
    queued = sum(1 for o, _ in results if o == "pending")
    if queued:
        print(f"{queued} yeni lid. Bot onları növbəti yoxlamada (ən çox {settings.fetch_interval_min} dəq.) Telegram-a göndərəcək.")
    return 1 if any(o == "invalid" for o, _ in results) else 0


def cmd_setup(args, settings) -> int:
    from .setup_wizard import run_setup
    env_path = Path(args.env) if args.env else ROOT / ".env"
    return run_setup(env_path, settings.bot_token, settings.allowed_chat_ids, force=args.force,
                     existing_ai_key=settings.anthropic_api_key)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="leadsbot", description="Azərbaycan hüquqi lid və iş elanı botu")
    p.add_argument("-v", "--verbose", action="store_true")
    p.add_argument("--env", help=".env faylının yolu")
    sub = p.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("fetch", help="bir dövrə: oxu, filtrlə, göndər (cron/GitHub Actions üçün)")
    f.add_argument("--dry-run", action="store_true", help="göndərmə, ekrana yaz")
    f.add_argument("--seed", action="store_true", help="yalnız başlanğıc nöqtəsi qoy, göndərmə")
    f.add_argument("--only", help="yalnız bu mənbə id-ləri (vergüllə)")
    f.add_argument("--no-ai", action="store_true", help="Claude qiymətləndirməsini bu dəfə keçir")
    f.set_defaults(func=cmd_fetch)

    s = sub.add_parser("serve", help="daimi rejim: əmrlərə cavab verir və intervalla yoxlayır")
    s.add_argument("--no-first-run", action="store_true", help="başlayan kimi yoxlama etmə")
    s.set_defaults(func=cmd_serve)

    c = sub.add_parser("check", help="mənbələri test et (bazaya yazmır, Telegram lazım deyil)")
    c.add_argument("--only")
    c.set_defaults(func=cmd_check)

    st = sub.add_parser("setup", help="interaktiv quraşdırma: token, çat ID, test mesajı")
    st.add_argument("--force", action="store_true", help="mövcud token və çat ID-ni yenidən soruş")
    st.set_defaults(func=cmd_setup)

    up = sub.add_parser("update", help="yeni versiyanı GitHub-dan endir (.env, data, .venv toxunulmur)")
    up.add_argument("--force", action="store_true", help="versiya eyni olsa da faylları yenidən yaz")
    up.set_defaults(func=cmd_update)

    ad = sub.add_parser("add", help="LinkedIn kimi saytda tapılan müraciəti botun növbəsinə qoy")
    ad.add_argument("--source", default="linkedin", help="mənbə (hazırda yalnız linkedin)")
    ad.add_argument("--file", help="JSON siyahı: [{\"link\", \"title\", \"text\", \"who\", \"date\"}]")
    ad.add_argument("--link")
    ad.add_argument("--title")
    ad.add_argument("--text", default="")
    ad.add_argument("--who", default="", help="kim yazıb: ad, vəzifə, şirkət")
    ad.add_argument("--date", default="")
    ad.set_defaults(func=cmd_add)

    sub.add_parser("sources", help="konfiqurasiyadakı mənbələri göstər").set_defaults(func=cmd_sources)
    sub.add_parser("send-test", help="Telegram-a test mesajı göndər").set_defaults(func=cmd_send_test)
    sub.add_parser("chatid", help="bota yazan çatların ID-lərini göstər").set_defaults(func=cmd_chatid)

    args = p.parse_args(argv)
    _logging(args.verbose)
    try:
        settings = load_settings(args.env)
        return args.func(args, settings)
    except (ConfigError, TelegramError) as exc:
        print(f"Xəta: {exc}", file=sys.stderr)
        return 2
    except (KeyboardInterrupt, EOFError):
        print("\nDayandırıldı.")
        return 130
    except Exception:
        logging.getLogger("leadsbot").exception("gözlənilməz xəta")
        print(f"\nGözlənilməz xəta. Ətraflı məlumat: {LOG_FILE}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
