"""
database.py | SmartCity AI — SQLite Database Layer
====================================================
Real, file-backed persistence (survives backend/browser/computer restarts).

Table: users
  id             INTEGER PRIMARY KEY AUTOINCREMENT
  name           TEXT NOT NULL
  email          TEXT NOT NULL UNIQUE   (stored lowercase/trimmed)
  password_hash  TEXT                   (NULL for google-only accounts)
  auth_provider  TEXT NOT NULL          ('local' | 'google')
  google_id      TEXT UNIQUE            (NULL for local accounts)
  profile_image  TEXT
  is_active      INTEGER NOT NULL DEFAULT 1
  created_at     TEXT NOT NULL
  updated_at     TEXT NOT NULL
  last_login     TEXT
"""

import sqlite3
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager

from config import Config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    name                      TEXT NOT NULL,
    email                     TEXT NOT NULL UNIQUE,
    password_hash             TEXT,
    auth_provider             TEXT NOT NULL DEFAULT 'local',
    google_id                 TEXT UNIQUE,
    profile_image             TEXT,
    is_active                 INTEGER NOT NULL DEFAULT 1,
    created_at                TEXT NOT NULL,
    updated_at                TEXT NOT NULL,
    last_login                TEXT,
    password_reset_token_hash TEXT,
    password_reset_expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE TABLE IF NOT EXISTS analytics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    page       TEXT NOT NULL,
    ip_hash    TEXT,
    user_agent TEXT,
    referrer   TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics(page);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);
"""


def get_connection():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db_cursor(commit=False):
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield cur
        if commit:
            conn.commit()
    finally:
        conn.close()


def init_db():
    with db_cursor(commit=True) as cur:
        cur.executescript(SCHEMA)

    # Backward-compatibility migration for existing SQLite databases created
    # before the password-reset fields were added. This avoids startup crashes
    # and preserves existing users while adding the new columns.
    with db_cursor() as cur:
        columns = [row[1] for row in cur.execute("PRAGMA table_info(users)")]

    if "password_reset_token_hash" not in columns:
        with db_cursor(commit=True) as cur:
            cur.execute(
                "ALTER TABLE users ADD COLUMN password_reset_token_hash TEXT"
            )
    if "password_reset_expires_at" not in columns:
        with db_cursor(commit=True) as cur:
            cur.execute(
                "ALTER TABLE users ADD COLUMN password_reset_expires_at TEXT"
            )

    # Ensure the reset-token index exists even when the table was created by an
    # older schema where the columns were added manually.
    with db_cursor(commit=True) as cur:
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token_hash)")
    print(f"[OK] Database ready at {Config.DATABASE_PATH}")


def _now():
    return datetime.now(timezone.utc).isoformat()


# ── User data-access functions ──────────────────────────────────────────

def find_user_by_email(email):
    email = email.strip().lower()
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        return dict(row) if row else None


def find_user_by_google_id(google_id):
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def find_user_by_id(user_id):
    with db_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def create_local_user(name, email, password_hash):
    email = email.strip().lower()
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            """INSERT INTO users
               (name, email, password_hash, auth_provider, is_active, created_at, updated_at)
               VALUES (?, ?, ?, 'local', 1, ?, ?)""",
            (name.strip(), email, password_hash, now, now),
        )
        new_id = cur.lastrowid
    return find_user_by_id(new_id)


def create_google_user(name, email, google_id, profile_image):
    email = email.strip().lower()
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            """INSERT INTO users
               (name, email, auth_provider, google_id, profile_image, is_active, created_at, updated_at)
               VALUES (?, ?, 'google', ?, ?, 1, ?, ?)""",
            (name.strip(), email, google_id, profile_image, now, now),
        )
        new_id = cur.lastrowid
    return find_user_by_id(new_id)


def link_google_to_existing_user(user_id, google_id, profile_image):
    """If a local account already exists with this email, link the Google identity
    to it instead of creating a duplicate account."""
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            """UPDATE users SET google_id = ?, profile_image = COALESCE(?, profile_image),
               updated_at = ? WHERE id = ?""",
            (google_id, profile_image, now, user_id),
        )
    return find_user_by_id(user_id)


def update_last_login(user_id):
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute("UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?", (now, now, user_id))


def update_local_user(user_id, name, email):
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            "UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?",
            (name.strip(), email.strip().lower(), now, user_id),
        )
    return find_user_by_id(user_id)


def update_password(user_id, password_hash):
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (password_hash, now, user_id),
        )


def set_password_reset_token(user_id, token_hash, expires_at):
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            "UPDATE users SET password_reset_token_hash = ?, password_reset_expires_at = ?, updated_at = ? WHERE id = ?",
            (token_hash, expires_at, now, user_id),
        )


def clear_password_reset_token(user_id):
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            "UPDATE users SET password_reset_token_hash = NULL, password_reset_expires_at = NULL, updated_at = ? WHERE id = ?",
            (now, user_id),
        )


def find_user_by_reset_token_hash(token_hash):
    with db_cursor() as cur:
        cur.execute(
            "SELECT * FROM users WHERE password_reset_token_hash = ? AND password_reset_expires_at IS NOT NULL",
            (token_hash,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def email_exists(email):
    return find_user_by_email(email) is not None


# ── Analytics data-access functions ─────────────────────────────────

def track_pageview(page, ip_hash, user_agent, referrer):
    """Record a page view. ip_hash is a salted hash of the IP (privacy-safe)."""
    now = _now()
    with db_cursor(commit=True) as cur:
        cur.execute(
            "INSERT INTO analytics (page, ip_hash, user_agent, referrer, created_at) VALUES (?, ?, ?, ?, ?)",
            (page, ip_hash, (user_agent or '')[:256], (referrer or '')[:512], now),
        )


def get_analytics_summary():
    """Return page-view counts for the last 7 days and all time."""
    with db_cursor() as cur:
        # Total views
        cur.execute("SELECT COUNT(*) FROM analytics")
        total = cur.fetchone()[0]

        # Views today
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        cur.execute("SELECT COUNT(*) FROM analytics WHERE created_at LIKE ?", (today + '%',))
        today_count = cur.fetchone()[0]

        # Views last 7 days
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        cur.execute("SELECT COUNT(*) FROM analytics WHERE created_at >= ?", (seven_days_ago,))
        week_count = cur.fetchone()[0]

        # Top pages (all time)
        cur.execute("SELECT page, COUNT(*) as cnt FROM analytics GROUP BY page ORDER BY cnt DESC LIMIT 10")
        top_pages = [{'page': row[0], 'views': row[1]} for row in cur.fetchall()]

        # Daily views for last 7 days
        cur.execute(
            "SELECT date(created_at) as day, COUNT(*) as cnt FROM analytics "
            "WHERE created_at >= ? GROUP BY day ORDER BY day",
            (seven_days_ago,)
        )
        daily = [{'date': row[0], 'views': row[1]} for row in cur.fetchall()]

        # Unique visitors (by ip_hash, approximate)
        cur.execute("SELECT COUNT(DISTINCT ip_hash) FROM analytics")
        unique_visitors = cur.fetchone()[0]

        return {
            'total_views': total,
            'today_views': today_count,
            'week_views': week_count,
            'unique_visitors': unique_visitors,
            'top_pages': top_pages,
            'daily_views': daily,
        }

