import os
import sqlite3

os.environ["DATABASE_PATH"] = os.path.join(os.path.dirname(__file__), "test_smartcity.db")
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["FLASK_ENV"] = "testing"

from app import create_app
import database as db


def test_api_health_and_register():
    # Clean slate: remove any leftover test DB from a prior run
    test_db = os.environ["DATABASE_PATH"]
    if os.path.exists(test_db):
        os.remove(test_db)

    try:
        app = create_app()
        client = app.test_client()

        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.get_json()["success"] is True
        assert health.get_json()["message"] == "SmartCityAI API is running"

        resp = client.post(
            "/api/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "TestPassword123!",
                "confirmPassword": "TestPassword123!",
            },
        )
        assert resp.status_code == 201
        assert resp.get_json()["success"] is True
    finally:
        # Leave no test database behind in the repo
        if os.path.exists(test_db):
            os.remove(test_db)


def test_init_db_migrates_legacy_schema():
    legacy_path = os.path.join(os.path.dirname(__file__), "legacy_test_smartcity.db")
    if os.path.exists(legacy_path):
        os.remove(legacy_path)

    conn = sqlite3.connect(legacy_path)
    conn.execute(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            auth_provider TEXT NOT NULL DEFAULT 'local',
            google_id TEXT UNIQUE,
            profile_image TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_login TEXT
        )
        """
    )
    conn.execute("INSERT INTO users (name, email, password_hash, auth_provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", (
        "Legacy User",
        "legacy@example.com",
        "hashedpw",
        "local",
        "2024-01-01T00:00:00+00:00",
        "2024-01-01T00:00:00+00:00",
    ))
    conn.commit()
    conn.close()

    original_db_path = db.Config.DATABASE_PATH
    os.environ["DATABASE_PATH"] = legacy_path
    db.Config.DATABASE_PATH = legacy_path

    try:
        db.init_db()

        conn = sqlite3.connect(legacy_path)
        columns = [row[1] for row in conn.execute("PRAGMA table_info(users)")]
        conn.close()

        assert "password_reset_token_hash" in columns
        assert "password_reset_expires_at" in columns
    finally:
        # Restore original Config so other tests aren't affected
        db.Config.DATABASE_PATH = original_db_path
        os.environ["DATABASE_PATH"] = original_db_path
        if os.path.exists(legacy_path):
            os.remove(legacy_path)


if __name__ == "__main__":
    """Run the tests directly: `python test_auth_api.py` (exit code 1 on failure).

    Without this block the file only *defined* the tests, so running it
    printed nothing and exited 0 even if every assertion would have failed.
    pytest still works too: `python -m pytest test_auth_api.py`
    """
    import sys

    tests = [test_api_health_and_register, test_init_db_migrates_legacy_schema]
    failed = []
    for t in tests:
        try:
            t()
            print(f"[PASS] {t.__name__}")
        except AssertionError as exc:
            failed.append(t.__name__)
            print(f"[FAIL] {t.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001 - report, then keep going
            failed.append(t.__name__)
            print(f"[ERROR] {t.__name__}: {type(exc).__name__}: {exc}")

    print(f"\n{len(tests) - len(failed)}/{len(tests)} passed")
    if failed:
        print("FAILED:", ", ".join(failed))
        sys.exit(1)
    print("ALL TESTS PASSED")
