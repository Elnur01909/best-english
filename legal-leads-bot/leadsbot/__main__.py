from __future__ import annotations

import argparse
import logging
import sys

from pathlib import Path

from .config import ROOT, ConfigError, load_profile, load_settings, load_sources
from .filters import Matcher
from .runner import check_sources, run_cycle
from .storage import Store
from .telegram import TelegramClient, TelegramError


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
    sources = load_sources(settings.sources_file)
    matcher = Matcher(load_profile(settings.keywords_file), store.user_keywords())
    tg, chats = None, []
    if not args.dry_run and not args.seed:
        tg = TelegramClient(settings.require_token(), timeout=settings.request_timeout)
        chats = [c for c in settings.require_chat_ids() if store.get(f"muted:{c}") != "1"]
    only = set(args.only.split(",")) if args.only else None
    report = run_cycle(settings, store, sources, matcher, tg, chats,
                       send=not args.dry_run, seed_only=args.seed, dry_run=args.dry_run, only=only)
    print(report.summary_text())
    for err in report.send_errors:
        print("Telegram:", err)
    return 1 if report.send_errors else 0


def cmd_serve(args, settings) -> int:
    from .bot import LeadsBot
    store = Store(settings.db_path)
    tg = TelegramClient(settings.require_token(), timeout=settings.request_timeout)
    me = tg.get_me()
    print(f"Bot: @{me.get('username')} — serve rejimi, hər {settings.fetch_interval_min} dəq. Ctrl+C ilə dayandırın.")
    bot = LeadsBot(settings, store, tg)
    try:
        bot.run_forever(run_first=not args.no_first_run)
    except KeyboardInterrupt:
        print("\nDayandırıldı.")
    return 0


def cmd_check(args, settings) -> int:
    sources = load_sources(settings.sources_file)
    store = Store(settings.db_path)
    matcher = Matcher(load_profile(settings.keywords_file), store.user_keywords())
    only = set(args.only.split(",")) if args.only else None
    rows = check_sources(settings, sources, matcher, only)
    bad = 0
    for r in rows:
        flag = "OFF " if not r["enabled"] else "    "
        if r["error"]:
            bad += 1
            print(f"❌ {flag}{r['id']:<24} {r['error']}")
        else:
            print(f"✅ {flag}{r['id']:<24} {r['count']:>3} element, {r['matched']:>3} uyğun")
            for s in r["sample"]:
                print(f"       · {s}")
    print(f"\n{len(rows) - bad}/{len(rows)} mənbə işləyir.")
    return 0


def cmd_sources(args, settings) -> int:
    for s in load_sources(settings.sources_file):
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


def cmd_setup(args, settings) -> int:
    from .setup_wizard import run_setup
    env_path = Path(args.env) if args.env else ROOT / ".env"
    return run_setup(env_path, settings.bot_token, settings.allowed_chat_ids, force=args.force)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="leadsbot", description="Azərbaycan hüquqi lid və iş elanı botu")
    p.add_argument("-v", "--verbose", action="store_true")
    p.add_argument("--env", help=".env faylının yolu")
    sub = p.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("fetch", help="bir dövrə: oxu, filtrlə, göndər (cron/GitHub Actions üçün)")
    f.add_argument("--dry-run", action="store_true", help="göndərmə, ekrana yaz")
    f.add_argument("--seed", action="store_true", help="yalnız başlanğıc nöqtəsi qoy, göndərmə")
    f.add_argument("--only", help="yalnız bu mənbə id-ləri (vergüllə)")
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
