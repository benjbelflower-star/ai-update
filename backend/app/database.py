import os
import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager

# Paths — overridable via env vars for Railway volume mount
_base = Path(__file__).parent.parent / "data"
DB_PATH    = Path(os.getenv("DB_PATH",    str(_base / "ai_update.db")))
CHARTS_DIR = Path(os.getenv("CHARTS_DIR", str(_base / "charts")))
AUDIO_DIR  = Path(os.getenv("AUDIO_DIR",  str(_base / "audio")))

# Seed files live in app/ so they survive Railway volume mounts on /data
_APP_DIR = Path(__file__).parent


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    with db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS reports (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                type         TEXT    NOT NULL CHECK(type IN ('learn', 'invest')),
                title        TEXT    NOT NULL,
                tagline      TEXT,
                generated_at TEXT    NOT NULL,
                content      TEXT    NOT NULL,
                tags         TEXT    DEFAULT '[]',
                sources_used TEXT    DEFAULT '[]'
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS reports_fts USING fts5(
                title,
                tagline,
                content,
                tags,
                content='reports',
                content_rowid='id',
                tokenize='porter ascii'
            );

            CREATE TRIGGER IF NOT EXISTS reports_ai
                AFTER INSERT ON reports BEGIN
                    INSERT INTO reports_fts(rowid, title, tagline, content, tags)
                    VALUES (new.id, new.title, new.tagline, new.content, new.tags);
                END;

            CREATE TRIGGER IF NOT EXISTS reports_ad
                AFTER DELETE ON reports BEGIN
                    INSERT INTO reports_fts(reports_fts, rowid, title, tagline, content, tags)
                    VALUES ('delete', old.id, old.title, old.tagline, old.content, old.tags);
                END;

            CREATE TABLE IF NOT EXISTS sources (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                name         TEXT    NOT NULL,
                url          TEXT    NOT NULL UNIQUE,
                type         TEXT    NOT NULL CHECK(type IN ('learn', 'invest', 'both')),
                score        REAL    DEFAULT 5.0,
                last_checked TEXT,
                active       INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS followed_stories (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                section_id TEXT    NOT NULL,
                headline   TEXT    NOT NULL,
                phrase     TEXT    DEFAULT '',
                tags       TEXT    DEFAULT '[]',
                created_at TEXT    NOT NULL,
                active     INTEGER DEFAULT 1,
                UNIQUE(report_id, section_id)
            );

            CREATE TABLE IF NOT EXISTS feedback (
                report_id  INTEGER PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
                vote       INTEGER NOT NULL CHECK(vote IN (1, -1)),
                created_at TEXT    NOT NULL,
                updated_at TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS watchlist (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                name     TEXT    NOT NULL UNIQUE,
                ticker   TEXT,
                category TEXT,
                score    REAL    DEFAULT 5.0,
                active   INTEGER DEFAULT 1
            );
        """)

    # Migration: add phrase column if upgrading from older schema
    with db() as conn:
        try:
            conn.execute("ALTER TABLE followed_stories ADD COLUMN phrase TEXT DEFAULT ''")
        except Exception:
            pass

    _seed_sources()
    _seed_watchlist()


def _seed_sources():
    seed_path = _APP_DIR / "sources_seed.json"
    if not seed_path.exists():
        return
    seeds = json.loads(seed_path.read_text())
    with db() as conn:
        for s in seeds:
            conn.execute(
                "INSERT OR IGNORE INTO sources (name, url, type, score) VALUES (?, ?, ?, ?)",
                (s["name"], s["url"], s["type"], s["score"])
            )


def _seed_watchlist():
    seed_path = _APP_DIR / "watchlist_seed.json"
    if not seed_path.exists():
        return
    seeds = json.loads(seed_path.read_text())
    with db() as conn:
        for w in seeds:
            conn.execute(
                "INSERT OR IGNORE INTO watchlist (name, ticker, category, score) VALUES (?, ?, ?, ?)",
                (w["name"], w.get("ticker"), w.get("category"), w["score"])
            )
