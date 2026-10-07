"""
app.py | SmartCity AI — Flask Backend (Predictions + Real Authentication)
===========================================================================
Runs on: http://localhost:8765

This replaces the old stdlib http.server (server.py). It serves:
  - The same prediction endpoints as before (predictions.py) — unchanged
    paths/response shapes, so the existing frontend keeps working.
  - Real authentication (auth.py) backed by SQLite (database.py):
    register, login, logout, /me, and Google OAuth.
  - A public landing page at / and the dashboard at /app.

Run:
    pip install -r requirements.txt
    python app.py
"""

from datetime import timedelta
import hashlib
import json
import os
import socket
import time
import urllib.request
from collections import defaultdict

from flask import Flask, jsonify, send_from_directory, redirect, request
from flask_cors import CORS

from config import Config
import database as db
from predictions import pred_bp
from auth import auth_bp, init_oauth


# ── Simple in-memory rate limiter ────────────────────────────────────
class RateLimiter:
    """Simple sliding-window rate limiter per IP address."""
    def __init__(self):
        self._hits = defaultdict(list)

    def is_rate_limited(self, key, max_hits, window_seconds):
        now = time.time()
        cutoff = now - window_seconds
        self._hits[key] = [t for t in self._hits[key] if t > cutoff]
        if len(self._hits[key]) >= max_hits:
            return True
        self._hits[key].append(now)
        return False

_limiter = RateLimiter()


def create_app():
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
    app = Flask(__name__, static_folder=frontend_dir, static_url_path="")

    # ── Core / session config ──────────────────────────────────────────
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = Config.IS_PRODUCTION
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

    # ── CORS ──────────────────────────────────────────────────────────
    CORS(
        app,
        supports_credentials=True,
        origins=[
            Config.FRONTEND_ORIGIN,
            "http://127.0.0.1:8765",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
        ],
    )

    # ── CSP Headers ───────────────────────────────────────────────────
    @app.after_request
    def set_security_headers(response):
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://localhost:8765 http://localhost:8888 https://www.google-analytics.com; "
            "frame-src https://www.google.com https://maps.google.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # ── Rate limiting middleware for auth endpoints ────────────────────
    @app.before_request
    def rate_limit_auth():
        auth_paths = ['/api/auth/register', '/api/auth/login', '/api/auth/forgot-password']
        if request.path in auth_paths and request.method == 'POST':
            ip = request.remote_addr or 'unknown'
            key = f"{request.path}:{ip}"
            # Register: 5 per 10 min, Login: 10 per 5 min, Forgot: 3 per 10 min
            limits = {
                '/api/auth/register': (5, 600),
                '/api/auth/login': (10, 300),
                '/api/auth/forgot-password': (3, 600),
            }
            max_hits, window = limits.get(request.path, (10, 300))
            if _limiter.is_rate_limited(key, max_hits, window):
                return jsonify({
                    "success": False,
                    "error": "Too many requests. Please try again later."
                }), 429

    # ── Database ──────────────────────────────────────────────────────
    db.init_db()



    # ── Blueprints ────────────────────────────────────────────────────
    app.register_blueprint(pred_bp)
    app.register_blueprint(auth_bp)
    google_ready = init_oauth(app)   # no-op unless GOOGLE_CLIENT_ID/SECRET are set
    app.config["GOOGLE_OAUTH_READY"] = bool(google_ready)

    @app.get("/api/health")
    def api_health():
        return {"success": True, "message": "SmartCityAI API is running"}

    # ── Analytics endpoints ─────────────────────────────────────────
    @app.post("/api/analytics/track")
    def track_view():
        data = request.get_json(silent=True) or {}
        page = data.get('page', '/')
        # Hash IP for privacy (never store raw IP)
        ip = request.remote_addr or 'unknown'
        ip_hash = hashlib.sha256(('smartcity-salt-' + ip).encode()).hexdigest()[:16]
        ua = request.headers.get('User-Agent', '')
        ref = request.headers.get('Referer', '')
        db.track_pageview(page, ip_hash, ua, ref)
        return jsonify({'success': True})

    @app.get("/api/analytics/summary")
    def analytics_summary():
        summary = db.get_analytics_summary()
        return jsonify({'success': True, 'analytics': summary})

    # ── Landing page (public) ────────────────────────────────────────
    @app.get("/")
    def landing():
        resp = app.make_response(send_from_directory(frontend_dir, "landing.html"))
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

    # ── Dashboard (authenticated app) ────────────────────────────────
    @app.get("/app/")
    def dashboard_root():
        return send_from_directory(frontend_dir, "index.html")

    @app.get("/app/<path:app_path>")
    def dashboard_files(app_path):
        requested = os.path.join(frontend_dir, app_path)
        if os.path.isfile(requested):
            return send_from_directory(frontend_dir, app_path)
        return send_from_directory(frontend_dir, "404.html"), 404

    # ── Frontend pages ───────────────────────────────────────────────
    @app.get("/<path:frontend_path>")
    def frontend_files(frontend_path):
        if frontend_path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        requested = os.path.join(frontend_dir, frontend_path)
        if os.path.isfile(requested):
            return send_from_directory(frontend_dir, frontend_path)
        return send_from_directory(frontend_dir, "404.html"), 404

    @app.errorhandler(404)
    def not_found(e):
        return send_from_directory(frontend_dir, "404.html"), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()


def _probe_existing_server(port):
    """Return True when a healthy SmartCityAI server already owns this port."""
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/health", timeout=1.5
        ) as resp:
            return resp.status == 200 and json.load(resp).get("success") is True
    except Exception:
        return False


def _port_is_free(port):
    """True when nothing is actively accepting connections on this port.

    Deliberately a *connect* probe, not a bind probe: Werkzeug sets
    allow_reuse_address=True, so on Windows a second process happily binds on
    top of a live one and requests get split between the new server and a
    stale/zombie one — the browser then loads a broken or outdated
    http://localhost:8765. A plain bind probe would instead false-positive on
    TIME_WAIT sockets left by the previous run, which SO_REUSEADDR already
    handles fine.
    """
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.settimeout(1.0)
    try:
        # 0 => something is accepting connections (a real conflict).
        return probe.connect_ex(("127.0.0.1", port)) != 0
    finally:
        probe.close()


def _print_port_conflict(port):
    print("+========================================+")
    print(f"|  Port {port} is already in use.        |")
    print("+========================================+")
    print("")
    print(f"  http://localhost:{port} is being held by another process, so")
    print("  a second server cannot take it over reliably.")
    print("")
    print("  On Windows a stale instance usually survives a closed console")
    print("  window. Find and stop it, then start the server again:")
    print("")
    print(f"      netstat -ano | findstr :{port}")
    print(f"      taskkill /F /PID <pid-from-above>")
    print("")
    print("  Then run:  python app.py")


if __name__ == "__main__":
    print("Starting SmartCityAI backend...")
    print(f"Environment: {Config.ENV}")
    print("API server:")
    print(f"http://localhost:{Config.PORT}")
    print("Database:")
    print("Connected")
    print("Authentication routes:")
    print("Registered")
    print("Server ready.")
    print("+========================================+")
    print("|  SmartCity AI Backend (Flask + SQLite) |")
    print(f"|  Running at http://localhost:{Config.PORT}           |")
    print(f"|  Frontend origin: {Config.FRONTEND_ORIGIN}")
    print(f"|  Google OAuth configured: {app.config.get('GOOGLE_OAUTH_READY', False)}")
    print("|  Rate limiting: ON (auth endpoints)    |")
    print("|  CSP headers: ON                       |")
    print("|  Press Ctrl+C to stop                  |")
    print("+========================================+")

    # The reloader's child inherits the parent's already-bound socket
    # (WERKZEUG_SERVER_FD). Probing the port there would find its own parent
    # listening and wrongly abort — skip both checks in that process.
    running_from_reloader = bool(os.environ.get("WERKZEUG_RUN_MAIN"))

    # A healthy server already owns the port: that IS the working site, so
    # say so instead of stacking a duplicate next to it.
    if not running_from_reloader and _probe_existing_server(Config.PORT):
        print(f"")
        print(f"  [OK] SmartCityAI is already running at http://localhost:{Config.PORT}")
        print("       Open that URL in your browser — no second server is needed.")
        print("       (To restart it, stop the old process first: "
              f"netstat -ano | findstr :{Config.PORT})")
        raise SystemExit(0)

    # Port held by something unhealthy (zombie process, another app): fail
    # loudly with instructions rather than appearing to start while the
    # browser keeps hitting the other listener.
    if not running_from_reloader and not _port_is_free(Config.PORT):
        _print_port_conflict(Config.PORT)
        raise SystemExit(1)

    app.run(host="0.0.0.0", port=Config.PORT, debug=not Config.IS_PRODUCTION)
