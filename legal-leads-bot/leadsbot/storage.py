from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .models import Item, MatchResult

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
CREATE INDEX IF NOT EXISTS idx_items_pending ON items (matched, sent, first_seen);
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
CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class Store:
    def __init__(self, path: Path | str):
        self.path = Path(path)
        if str(self.path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.path))
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def close(self) -> None:
        self.conn.close()

    # ── items ──
    def has_any(self, source_id: str) -> bool:
        row = self.conn.execute("SELECT 1 FROM items WHERE source_id=? LIMIT 1", (source_id,)).fetchone()
        return row is not None

    def is_seen(self, source_id: str, uid: str) -> bool:
        row = self.conn.execute("SELECT 1 FROM items WHERE source_id=? AND uid=?", (source_id, uid)).fetchone()
        return row is not None

    def add_item(self, item: Item, match: MatchResult | None, suppress: bool = False) -> None:
        """suppress=True → heç vaxt göndərilməyəcək (baseline / sükutla qeyd)."""
        self.conn.execute(
            """INSERT OR IGNORE INTO items
               (source_id, uid, title, link, origin, published, category, score, hits, matched, sent, first_seen)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                item.source_id, item.uid, item.title[:500], item.link, item.origin, item.published,
                match.category if match else None,
                match.score if match else 0,
                ", ".join(match.hits) if match else None,
                1 if match else 0,
                1 if (suppress or not match) else 0,
                now_iso(),
            ),
        )
        self.conn.commit()

    def pending(self, limit: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM items WHERE matched=1 AND sent=0 ORDER BY first_seen ASC, score DESC LIMIT ?",
            (limit,),
        ).fetchall()

    def pending_count(self) -> int:
        return self.conn.execute("SELECT COUNT(*) FROM items WHERE matched=1 AND sent=0").fetchone()[0]

    def mark_sent(self, source_id: str, uid: str) -> None:
        self.conn.execute(
            "UPDATE items SET sent=1, sent_at=? WHERE source_id=? AND uid=?", (now_iso(), source_id, uid)
        )
        self.conn.commit()

    def recent_matches(self, n: int = 10) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM items WHERE matched=1 ORDER BY first_seen DESC LIMIT ?", (n,)
        ).fetchall()

    def stats(self) -> dict:
        q = self.conn.execute
        return {
            "items": q("SELECT COUNT(*) FROM items").fetchone()[0],
            "matched": q("SELECT COUNT(*) FROM items WHERE matched=1").fetchone()[0],
            "sent": q("SELECT COUNT(*) FROM items WHERE matched=1 AND sent=1 AND sent_at IS NOT NULL").fetchone()[0],
            "pending": self.pending_count(),
            "by_category": {
                r["category"]: r["c"]
                for r in q("SELECT category, COUNT(*) c FROM items WHERE matched=1 GROUP BY category").fetchall()
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

    # ── user keywords ──
    def user_keywords(self) -> list[str]:
        return [r["keyword"] for r in self.conn.execute("SELECT keyword FROM user_keywords ORDER BY keyword").fetchall()]

    def add_keyword(self, kw: str) -> bool:
        kw = kw.strip()
        if not kw:
            return False
        cur = self.conn.execute(
            "INSERT OR IGNORE INTO user_keywords (keyword, added_at) VALUES (?, ?)", (kw, now_iso())
        )
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

    def set(self, key: str, value: str) -> None:
        self.conn.execute(
            "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        self.conn.commit()

    def delete(self, key: str) -> None:
        self.conn.execute("DELETE FROM kv WHERE key=?", (key,))
        self.conn.commit()
