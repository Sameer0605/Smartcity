"""
config.py | SmartCity AI — Environment Configuration
=====================================================
Loads all secrets/config from environment variables (.env file).
NEVER hardcode secrets here — this file only reads them.
"""

import os
import secrets
from dotenv import load_dotenv

# Always read backend/.env — never depend on the process working directory,
# so `python backend/app.py` behaves the same as `cd backend && python app.py`.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))


def _get(key, default=None, required=False):
    val = os.environ.get(key, default)
    if required and not val:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Copy .env.example to .env and fill it in."
        )
    return val


class Config:
    # -- Core --
    PORT = int(_get("PORT", "8765"))
    ENV = _get("FLASK_ENV", "development")
    IS_PRODUCTION = ENV == "production"

    # -- Database --
    # A relative path (the default in .env) is anchored to backend/, not to the
    # shell's working directory. Otherwise starting the server from a different
    # folder silently creates a second, empty smartcity.db there and every
    # registered account appears to vanish.
    _db_path = _get("DATABASE_PATH", "smartcity.db")
    DATABASE_URL = _get("DATABASE_URL", "")
    DATABASE_PATH = (
        _db_path if os.path.isabs(_db_path)
        else os.path.join(BACKEND_DIR, os.path.basename(_db_path))
    )

    # -- Session / cookie secret --
    # In dev, auto-generate one if missing so the app still runs; warn loudly.
    SECRET_KEY = _get("SECRET_KEY")
    if not SECRET_KEY:
        SECRET_KEY = secrets.token_hex(32)
        print("[WARN] SECRET_KEY not set in .env -- using a random ephemeral key.")
        print("   Sessions will NOT survive a server restart until you set SECRET_KEY in .env")

    # -- CORS: the frontend origin allowed to make authenticated requests --
    FRONTEND_ORIGIN = _get("FRONTEND_ORIGIN", "http://localhost:8765")

    # -- Google OAuth --
    GOOGLE_CLIENT_ID = _get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = _get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_CALLBACK_URL = _get(
        "GOOGLE_CALLBACK_URL", f"http://localhost:{PORT}/api/auth/google/callback"
    )
    GOOGLE_CONFIGURED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

    # Where to send the browser after a successful Google login
    FRONTEND_APP_URL = _get("FRONTEND_APP_URL", "http://localhost:8765/app/")
    FRONTEND_LOGIN_URL = _get("FRONTEND_LOGIN_URL", "http://localhost:8765/login.html")
