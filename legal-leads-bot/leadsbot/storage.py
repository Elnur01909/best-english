from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .models import Item, MatchResult, Source

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    source_id   TEXT NOT NULL,
    uid         TEXT NOT NULL,
    title       TEXT,
    link        TEXT,
    origin      TEXT,
    published   TEXT,
    category    TEXT,
    score       INTEGER DEFAULT 0,
    hits        TEXT,
    matched     INTEGER DEFAULT 0,
    sent        INTEGER DEFAULT 0,
    first_seen  TEXT NOT NULL,
    sent_at     TEXT,
    PRIMARY KEY (source_id, uid)
);
CREATE TABLE IF NOT EXISTS source_state (
    source_id   TEXT PRIMARY KEY,
    enabled     INTEGER,
    last_run    TEXT,
    last_status TEXT,
    last_count  INTEGER,
    last_error  TEXT
);
CREATE TABLE IF NOT EXISTS user_keywords (
    keyword  TEXT PRIMARY KEY,
    added_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_sources (
    id        TEXT PRIMARY KEY,
    type      TEXT NOT NULL,
    channel   TEXT,
    name      TEXT,
    category  TEXT,
    added_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""

# v2 sütunları — köhnə bazalara ALTER TABLE ilə əlavə olunur
ITEM_COLUMNS = {
    "summary": "TEXT",
    "title_key": "TEXT",
    "status": "TEXT DEFAULT 'new'",  # new | interested | contacted | not_relevant | duplicate | low
    "status_at": "TEXT",
    "ai_done": "INTEGER DEFAULT 0",  # 0 gözləyir, 1 qiymətləndirildi, -1 xəta / AI yoxdur
    "ai_score": "INTEGER",
    "ai_category": "TEXT",
    "ai_service": "TEXT",
    "ai_summary": "TEXT",
    "ai_reason": "TEXT",
    "digest_state": "INTEGER DEFAULT 0",  # 0 yox, 1 xülasə növbəsində, 2 xülasədə göndərilib
}

STATUSES = ("new", "interested", "contacted", "not_relevant", "duplicate", "low", "hidden")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


_GN_SUFFIX = re.compile(r"\s+[-–—|]\s+[^-–—|]{2,60}$")
_NON_WORD = re.compile(r"[^\w]+", re.UNICODE)


def title_key(title: str) -> str:
    """Eyni xəbəri müxtəlif mənbələrdə tanımaq üçün normallaşdırılmış başlıq.
    Google News başlığın sonuna ' - Nəşriyyat' əlavə edir; onu atırıq."""
    t = (title or "").strip()
    t = _GN_SUFFIX.sub("", t)
    t = _NON_WORD.sub(" ", t.lower()).strip()
    return t[:90]


class Store:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        if str(self.path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.path))
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self._migrate()

    def _migrate(self) -> None:
        have = {r["name"] for r in self.conn.execute("PRAGMA table_info(items)").fetchall()}
        for col, ddl in ITEM_COLUMNS.items():
            if col not in have:
                self.conn.execute(f"ALTER TABLE items ADD COLUMN {col} {ddl}")
        if "title_key" not in have:  # köhnə sətirlər üçün doldur
            rows = self.conn.execute("SELECT rowid, title FROM items").fetchall()
            self.conn.executemany("UPDATE items SET title_key=? WHERE rowid=?",
                                  [(title_key(r["title"] or ""), r["rowid"]) for r in rows])
        user_cols = {r["name"] for r in self.conn.execute("PRAGMA table_info(user_sources)").fetchall()}
        if "url" not in user_cols:
            self.conn.execute("ALTER TABLE user_sources ADD COLUMN url TEXT")
        self.conn.executescript("""
            CREATE INDEX IF NOT EXISTS idx_items_pending ON items (matched, sent, first_seen);
            CREATE INDEX IF NOT EXISTS idx_items_title_key ON items (title_key);
            CREATE INDEX IF NOT EXISTS idx_items_status ON items (status);
            CREATE INDEX IF NOT EXISTS idx_items_digest ON items (digest_state);
        """)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # ── items ──
    def has_any(self, source_id: str) -> bool:
        return self.conn.execute("SELECT 1 FROM items WHERE source_id=? LIMIT 1", (source_id,)).fetchone() is not None

    def is_seen(self, source_id: str, uid: str) -> bool:
        return self.conn.execute("SELECT 1 FROM items WHERE source_id=? AND uid=?", (source_id, uid)).fetchone() is not None

    def is_duplicate_title(self, key: str) -> bool:
        if not key or len(key) < 12:
            return False
        return self.conn.execute("SELECT 1 FROM items WHERE title_key=? LIMIT 1", (key,)).fetchone() is not None

    def add_item(self, item: Item, match: MatchResult | None, suppress: bool = False) -> str:
        """Elementi yazır. Qaytarır: 'baseline' | 'duplicate' | 'pending' | 'ignored'.
        suppress=True → heç vaxt göndərilməyəcək (başlanğıc nöqtəsi)."""
        key = title_key(item.title)
        duplicate = bool(match) and not suppress and self.is_duplicate_title(key)
        if suppress:
            outcome = "baseline"
        elif not match:
            outcome = "ignored"
        elif duplicate:
            outcome = "duplicate"
        else:
            outcome = "pending"
        self.conn.execute(
            """INSERT OR IGNORE INTO items
               (source_id, uid, title, link, origin, published, category, score, hits, matched, sent,
                first_seen, summary, title_key, status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                item.source_id, item.uid, item.title[:500], item.link, item.origin, item.published,
                match.category if match else None,
                match.score if match else 0,
                ", ".join(match.hits) if match else None,
                1 if match else 0,
                0 if outcome == "pending" else 1,
                now_iso(),
                (item.summary or "")[:1500],
                key,
                "duplicate" if outcome == "duplicate" else "new",
            ),
        )
        self.conn.commit()
        return outcome

    def pending(self, limit: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            """SELECT rowid AS id, * FROM items WHERE matched=1 AND sent=0
               ORDER BY COALESCE(ai_score, 0) DESC, score DESC, first_seen ASC LIMIT ?""",
            (limit,),
        ).fetchall()

    def pending_count(self) -> int:
        return self.conn.execute("SELECT COUNT(*) FROM items WHERE matched=1 AND sent=0").fetchone()[0]

    def unscored(self, limit: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            """SELECT rowid AS id, * FROM items WHERE matched=1 AND sent=0 AND ai_done=0
               ORDER BY first_seen ASC LIMIT ?""",
            (limit,),
        ).fetchall()

    def set_ai(self, item_id: int, score: int, category: str, service: str, summary: str, reason: str) -> None:
        self.conn.execute(
            """UPDATE items SET ai_done=1, ai_score=?, ai_category=?, ai_service=?, ai_summary=?, ai_reason=?
               WHERE rowid=?""",
            (score, category, service[:200], summary[:800], reason[:400], item_id),
        )
        self.conn.commit()

    def mark_ai_failed(self, ids: list[int]) -> None:
        self.conn.executemany("UPDATE items SET ai_done=-1 WHERE rowid=? AND ai_done=0", [(i,) for i in ids])
        self.conn.commit()

    def mark_sent(self, item_id: int) -> None:
        self.conn.execute("UPDATE items SET sent=1, sent_at=? WHERE rowid=?", (now_iso(), item_id))
        self.conn.commit()

    def mark_filtered(self, item_id: int) -> None:
        self.conn.execute("UPDATE items SET sent=1, status='low' WHERE rowid=?", (item_id,))
        self.conn.commit()

    def mark_hidden(self, item_id: int) -> None:
        """Bu növ lid Telegram-a göndərilmir (/types)."""
        self.conn.execute("UPDATE items SET sent=1, status='hidden' WHERE rowid=?", (item_id,))
        self.conn.commit()

    def queue_digest(self, item_id: int) -> None:
        self.conn.execute("UPDATE items SET sent=1, digest_state=1 WHERE rowid=?", (item_id,))
        self.conn.commit()

    def digest_items(self) -> list[sqlite3.Row]:
        return self.conn.execute(
            """SELECT rowid AS id, * FROM items WHERE digest_state=1
               ORDER BY COALESCE(ai_score, 0) DESC, score DESC, first_seen DESC"""
        ).fetchall()

    def mark_digested(self, ids: list[int]) -> None:
        stamp = now_iso()
        self.conn.executemany("UPDATE items SET digest_state=2, sent_at=? WHERE rowid=?", [(stamp, i) for i in ids])
        self.conn.commit()

    def set_status(self, item_id: int, status: str) -> bool:
        if status not in STATUSES:
            raise ValueError(status)
        cur = self.conn.execute("UPDATE items SET status=?, status_at=? WHERE rowid=?", (status, now_iso(), item_id))
        self.conn.commit()
        return cur.rowcount > 0

    def by_status(self, statuses: tuple[str, ...], limit: int = 30) -> list[sqlite3.Row]:
        marks = ",".join("?" for _ in statuses)
        return self.conn.execute(
            f"SELECT rowid AS id, * FROM items WHERE status IN ({marks}) ORDER BY status_at DESC LIMIT ?",
            (*statuses, limit),
        ).fetchall()

    def recent_negative_titles(self, n: int = 10) -> list[str]:
        rows = self.conn.execute(
            "SELECT title FROM items WHERE status='not_relevant' ORDER BY status_at DESC LIMIT ?", (n,)
        ).fetchall()
        return [r["title"] for r in rows if r["title"]]

    def recent_matches(self, n: int = 10) -> list[sqlite3.Row]:
        return self.conn.execute(
            """SELECT rowid AS id, * FROM items WHERE matched=1 AND status NOT IN ('duplicate', 'low', 'hidden')
               ORDER BY first_seen DESC LIMIT ?""", (n,)
        ).fetchall()

    def stats(self) -> dict:
        q = self.conn.execute
        return {
            "items": q("SELECT COUNT(*) FROM items").fetchone()[0],
            "matched": q("SELECT COUNT(*) FROM items WHERE matched=1").fetchone()[0],
            "sent": q("SELECT COUNT(*) FROM items WHERE matched=1 AND sent_at IS NOT NULL").fetchone()[0],
            "pending": self.pending_count(),
            "digest_queue": q("SELECT COUNT(*) FROM items WHERE digest_state=1").fetchone()[0],
            "duplicates": q("SELECT COUNT(*) FROM items WHERE status='duplicate'").fetchone()[0],
            "low": q("SELECT COUNT(*) FROM items WHERE status='low'").fetchone()[0],
            "by_category": {
                r["category"]: r["c"]
                for r in q("SELECT category, COUNT(*) c FROM items WHERE matched=1 GROUP BY category").fetchall()
            },
            "by_status": {
                r["status"]: r["c"]
                for r in q("SELECT status, COUNT(*) c FROM items WHERE matched=1 GROUP BY status").fetchall()
            },
        }

    # ── source state ──
    def set_source_state(self, source_id: str, status: str, count: int, error: str | None) -> None:
        self.conn.execute(
            """INSERT INTO source_state (source_id, enabled, last_run, last_status, last_count, last_error)
               VALUES (?, NULL, ?, ?, ?, ?)
               ON CONFLICT(source_id) DO UPDATE SET
                 last_run=excluded.last_run, last_status=excluded.last_status,
                 last_count=excluded.last_count, last_error=excluded.last_error""",
            (source_id, now_iso(), status, count, error),
        )
        self.conn.commit()

    def source_states(self) -> dict[str, sqlite3.Row]:
        return {r["source_id"]: r for r in self.conn.execute("SELECT * FROM source_state").fetchall()}

    def read_recently(self, source_id: str, hours: float) -> bool:
        """Mənbə son `hours` saatda uğurla oxunubsa True."""
        row = self.conn.execute("SELECT last_run, last_status FROM source_state WHERE source_id=?", (source_id,)).fetchone()
        if row is None or not row["last_run"] or row["last_status"] != "ok":
            return False
        return datetime.now(timezone.utc) - datetime.fromisoformat(row["last_run"]) < timedelta(hours=hours)

    def set_source_enabled(self, source_id: str, enabled: bool) -> None:
        self.conn.execute(
            """INSERT INTO source_state (source_id, enabled) VALUES (?, ?)
               ON CONFLICT(source_id) DO UPDATE SET enabled=excluded.enabled""",
            (source_id, 1 if enabled else 0),
        )
        self.conn.commit()

    def source_enabled(self, source_id: str, default: bool) -> bool:
        row = self.conn.execute("SELECT enabled FROM source_state WHERE source_id=?", (source_id,)).fetchone()
        if row is None or row["enabled"] is None:
            return default
        return bool(row["enabled"])

    # ── user sources (/addtg, /addrss) ──
    def add_user_source(self, src: Source) -> bool:
        cur = self.conn.execute(
            "INSERT OR IGNORE INTO user_sources (id, type, channel, name, category, added_at, url) VALUES (?,?,?,?,?,?,?)",
            (src.id, src.type, src.channel, src.name, src.category, now_iso(), src.url),
        )
        self.conn.commit()
        return cur.rowcount > 0

    def remove_user_source(self, source_id: str) -> bool:
        cur = self.conn.execute("DELETE FROM user_sources WHERE id=?", (source_id,))
        self.conn.commit()
        return cur.rowcount > 0

    def user_sources(self) -> list[Source]:
        out = []
        for r in self.conn.execute("SELECT * FROM user_sources ORDER BY added_at").fetchall():
            if r["type"] == "rss":
                cat = r["category"] or "individual"
                out.append(Source(
                    id=r["id"], name=r["name"] or "RSS", type="rss", url=r["url"], category=cat,
                    categories=None if cat == "other" else [cat], require_geo=False, enabled=True, expect_empty=True,
                    ai_screen="google.com/alerts/feeds/" in (r["url"] or ""),
                    note="/addrss ilə əlavə edilib", user_added=True,
                ))
                continue
            if r["type"] != "tg_channel":
                continue
            cat = r["category"] or "job"
            out.append(Source(
                id=r["id"], name=r["name"] or f"Telegram @{r['channel']}", type="tg_channel",
                channel=r["channel"], category=cat, categories=None if cat == "other" else [cat],
                require_geo=False, enabled=True, note="/addtg ilə əlavə edilib", user_added=True,
            ))
        return out

    # ── user keywords ──
    def user_keywords(self) -> list[str]:
        return [r["keyword"] for r in self.conn.execute("SELECT keyword FROM user_keywords ORDER BY keyword").fetchall()]

    def add_keyword(self, kw: str) -> bool:
        kw = kw.strip()
        if not kw:
            return False
        cur = self.conn.execute("INSERT OR IGNORE INTO user_keywords (keyword, added_at) VALUES (?, ?)", (kw, now_iso()))
        self.conn.commit()
        return cur.rowcount > 0

    def remove_keyword(self, kw: str) -> bool:
        cur = self.conn.execute("DELETE FROM user_keywords WHERE lower(keyword)=lower(?)", (kw.strip(),))
        self.conn.commit()
        return cur.rowcount > 0

    # ── kv ──
    def get(self, key: str, default: str | None = None) -> str | None:
        row = self.conn.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
        return row["value"] if row else default

    def get_item(self, item_id: int) -> sqlite3.Row | None:
        return self.conn.execute("SELECT rowid AS id, * FROM items WHERE rowid=?", (item_id,)).fetchone()

    def set(self, key: str, value: str) -> None:
        self.conn.execute(
            "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        self.conn.commit()

    def delete(self, key: str) -> None:
        self.conn.execute("DELETE FROM kv WHERE key=?", (key,))
        self.conn.commit()
