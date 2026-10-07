"""
auth.py | SmartCity AI — Authentication Blueprint
===================================================
Endpoints:
  POST /api/auth/register          — create local account (bcrypt-hashed password)
  POST /api/auth/login             — verify credentials, start session
  POST /api/auth/logout            — end session
  GET  /api/auth/me                — who is logged in right now (if anyone)
  PUT  /api/auth/profile           — update name/email
  POST /api/auth/change-password   — change password (requires current password)
  POST /api/auth/forgot-password   — generate reset token (prints to console in dev)
  POST /api/auth/reset-password    — reset password with token
  GET  /api/auth/google            — start Google OAuth flow
  GET  /api/auth/google/callback   — Google redirects back here

Session strategy:
  Flask's built-in session cookie — cryptographically signed (itsdangerous)
  with SECRET_KEY, HttpOnly, so frontend JS can never read or forge it.
  Only a user id is stored in the cookie; nothing sensitive.
"""

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from flask import Blueprint, request, jsonify, session, redirect, current_app

import database as db
from config import Config

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LEN = 8
MAX_NAME_LEN = 100
MAX_EMAIL_LEN = 254


# ── Helpers ──────────────────────────────────────────────────────────────

def public_user(user):
    """Never return password_hash or internal fields to the browser."""
    if not user:
        return None
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "profileImage": user.get("profile_image"),
        "authProvider": user["auth_provider"],
    }


def hash_password(plain):
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain, password_hash):
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _check_password_strength(password):
    """Return an error string if the password is too weak, else None."""
    if len(password) < MIN_PASSWORD_LEN:
        return f"Password must be at least {MIN_PASSWORD_LEN} characters."
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return "Password must contain at least one number."
    return None


def validate_registration(name, email, password, confirm_password):
    if not name or not name.strip():
        return "Please enter your full name."
    if len(name.strip()) > MAX_NAME_LEN:
        return f"Name must be at most {MAX_NAME_LEN} characters."
    if not email or not EMAIL_RE.match(email.strip()):
        return "Please enter a valid email."
    if len(email.strip()) > MAX_EMAIL_LEN:
        return "Email address is too long."
    if password != confirm_password:
        return "Passwords do not match."
    return _check_password_strength(password)


def validate_password_reset(password, confirm_password):
    if password != confirm_password:
        return "Passwords do not match."
    return _check_password_strength(password)


def hash_reset_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_reset_url(token):
    return f"{Config.FRONTEND_ORIGIN}/reset-password.html?token={token}"


def issue_reset_token(user):
    token = secrets.token_urlsafe(24)
    expiry = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.set_password_reset_token(user["id"], hash_reset_token(token), expiry.isoformat())
    return token, expiry


def validate_reset_token(token, user):
    if not token or not user:
        return False
    if user.get("password_reset_expires_at") is None:
        return False
    expires_at = datetime.fromisoformat(user["password_reset_expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        return False
    return hash_reset_token(token) == (user.get("password_reset_token_hash") or "")


# ── Routes ───────────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    confirm_password = body.get("confirmPassword") or ""

    error = validate_registration(name, email, password, confirm_password)
    if error:
        return jsonify({"success": False, "error": error}), 400

    if db.email_exists(email):
        return jsonify({
            "success": False,
            "error": "An account with this email already exists. Please sign in.",
        }), 409

    password_hash = hash_password(password)
    user = db.create_local_user(name, email, password_hash)

    return jsonify({"success": True, "user": public_user(user)}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "error": "Invalid email or password."}), 400

    user = db.find_user_by_email(email)

    # Generic error either way — don't reveal whether the email exists.
    if not user or user["auth_provider"] != "local" or not verify_password(password, user["password_hash"]):
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    if not user["is_active"]:
        return jsonify({"success": False, "error": "This account has been disabled."}), 403

    db.update_last_login(user["id"])
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = bool(body.get("rememberMe"))

    return jsonify({"success": True, "user": public_user(user)})


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully."})


@auth_bp.route("/me", methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": True, "authenticated": False})
    user = db.find_user_by_id(user_id)
    if not user or not user["is_active"]:
        session.clear()
        return jsonify({"success": True, "authenticated": False})
    return jsonify({"success": True, "authenticated": True, "user": public_user(user)})


@auth_bp.route("/profile", methods=["PUT"])
def update_profile():
    user_id = session.get("user_id")
    user = db.find_user_by_id(user_id) if user_id else None
    if not user or not user["is_active"]:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    if not name:
        return jsonify({"success": False, "error": "Name is required."}), 400
    if len(name) > MAX_NAME_LEN:
        return jsonify({"success": False, "error": f"Name must be at most {MAX_NAME_LEN} characters."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"success": False, "error": "Please enter a valid email."}), 400
    if len(email) > MAX_EMAIL_LEN:
        return jsonify({"success": False, "error": "Email address is too long."}), 400
    existing = db.find_user_by_email(email)
    if existing and existing["id"] != user["id"]:
        return jsonify({"success": False, "error": "That email is already in use."}), 409

    updated = db.update_local_user(user["id"], name, email)
    return jsonify({"success": True, "user": public_user(updated)})


@auth_bp.route("/change-password", methods=["POST"])
def change_password():
    user_id = session.get("user_id")
    user = db.find_user_by_id(user_id) if user_id else None
    if not user or not user["is_active"]:
        return jsonify({"success": False, "error": "Authentication required."}), 401
    if user["auth_provider"] != "local":
        return jsonify({"success": False, "error": "Google accounts do not have a local password."}), 400

    body = request.get_json(silent=True) or {}
    current_password = body.get("currentPassword") or ""
    new_password = body.get("newPassword") or ""
    confirm_password = body.get("confirmPassword") or ""
    if not verify_password(current_password, user.get("password_hash")):
        return jsonify({"success": False, "error": "Current password is incorrect."}), 400
    error = validate_password_reset(new_password, confirm_password)
    if error:
        return jsonify({"success": False, "error": error}), 400

    db.update_password(user["id"], hash_password(new_password))
    return jsonify({"success": True, "message": "Password updated successfully."})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()

    if not email or not EMAIL_RE.match(email):
        return jsonify({"success": False, "message": "Please enter a valid email address."}), 400

    user = db.find_user_by_email(email)
    if user and user.get("auth_provider") == "local":
        token, expires = issue_reset_token(user)
        reset_url = build_reset_url(token)
        print(f"[DEV RESET] Password reset requested for {email}")
        print(f"[DEV RESET] Reset URL: {reset_url}")
        print(f"[DEV RESET] Expires: {expires.isoformat()}")
    else:
        # Don't reveal whether the email exists
        print(f"[DEV RESET] Password reset requested for unknown or non-local account: {email}")

    return jsonify({
        "success": True,
        "message": "If an account exists for this email, a password reset link has been generated.",
    })


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    body = request.get_json(silent=True) or {}
    token = (body.get("token") or "").strip()
    password = body.get("password") or ""
    confirm_password = body.get("confirmPassword") or ""

    error = validate_password_reset(password, confirm_password)
    if error:
        return jsonify({"success": False, "message": error}), 400

    if not token:
        return jsonify({"success": False, "message": "Reset token is missing or invalid."}), 400

    # Query by token hash directly instead of loading all users
    token_hash = hash_reset_token(token)
    candidate = db.find_user_by_reset_token_hash(token_hash)

    if not candidate or not validate_reset_token(token, candidate):
        return jsonify({"success": False, "message": "This password reset link is invalid or has expired."}), 400

    new_hash = hash_password(password)
    db.clear_password_reset_token(candidate["id"])
    with db.db_cursor(commit=True) as cur:
        db._execute(
            cur,
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (new_hash, db._now(), candidate["id"]),
        )

    return jsonify({"success": True, "message": "Password reset successfully."})


# ── Google OAuth (OpenID Connect, via Authlib) ─────────────────────────
# Without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in backend/.env the two
# routes below bounce back to the login page with ?error=google_not_configured,
# which is the message frontend/js/auth.js already knows how to display.

oauth = None          # created by init_oauth() when credentials exist
_google_ready = False


def init_oauth(app):
    """Register the Google OIDC client on this app instance.

    Returns True when Google sign-in is actually usable. Never raises:
    a broken credential string must not stop the server from booting.
    """
    global oauth, _google_ready
    oauth, _google_ready = None, False
    if not Config.GOOGLE_CONFIGURED:
        return False
    try:
        from authlib.integrations.flask_client import OAuth

        oauth = OAuth(app)
        oauth.register(
            name="google",
            client_id=Config.GOOGLE_CLIENT_ID,
            client_secret=Config.GOOGLE_CLIENT_SECRET,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )
        _google_ready = True
    except Exception as exc:  # pragma: no cover - defensive
        print(f"[WARN] Google OAuth could not be initialised: {exc}")
        oauth, _google_ready = None, False
    return _google_ready


def _google_unavailable():
    return redirect(f"{Config.FRONTEND_LOGIN_URL}?error=google_not_configured")


def _google_failed():
    return redirect(f"{Config.FRONTEND_LOGIN_URL}?error=google_failed")


@auth_bp.route("/google", methods=["GET"])
def google_login():
    """Start the OpenID Connect flow (or explain that it isn't configured)."""
    if not _google_ready or oauth is None:
        return _google_unavailable()
    if request.args.get("error"):
        # Google bounced back with an error of its own
        return _google_failed()
    try:
        return oauth.google.authorize_redirect(Config.GOOGLE_CALLBACK_URL)
    except Exception as exc:
        print(f"[WARN] Google authorize_redirect failed: {exc}")
        return _google_failed()


@auth_bp.route("/google/callback", methods=["GET"])
def google_callback():
    """Handle Google's redirect: log the user in, link the identity, or create the account."""
    if not _google_ready or oauth is None:
        return _google_unavailable()
    try:
        if request.args.get("error"):
            return _google_failed()

        token = oauth.google.authorize_access_token()
        userinfo = token.get("userinfo")
        if not userinfo:
            userinfo = oauth.google.parse_id_token(token)

        google_id = (userinfo or {}).get("sub")
        email = ((userinfo or {}).get("email") or "").strip().lower()
        if not google_id or not email:
            return _google_failed()

        user = db.find_user_by_google_id(google_id)
        if not user:
            existing = db.find_user_by_email(email)
            if existing:
                # Link instead of creating a duplicate account for the same email
                user = db.link_google_to_existing_user(
                    existing["id"], google_id, userinfo.get("picture")
                )
            else:
                try:
                    user = db.create_google_user(
                        userinfo.get("name") or email.split("@")[0],
                        email,
                        google_id,
                        userinfo.get("picture"),
                    )
                except Exception:
                    # Unique-email race: another request created it first
                    user = db.find_user_by_email(email)

        if not user or not user.get("is_active"):
            return _google_failed()

        db.update_last_login(user["id"])
        session.clear()
        session["user_id"] = user["id"]
        session.permanent = True
        return redirect(Config.FRONTEND_APP_URL)
    except Exception as exc:
        print(f"[WARN] Google callback failed: {exc}")
        return _google_failed()


