# 🏙️ SmartCity AI — India Urban Intelligence Platform

## 🔐 Authentication — Implementation Report

### Files Changed
**New (backend):** `config.py`, `database.py`, `auth.py`, `predictions.py`, `app.py`, `.env.example`
**New (frontend):** `login.html`, `register.html`, `js/auth.js`, `js/auth-guard.js`, `css/auth.css`
**Modified:** `frontend/index.html` (added `auth-guard.js` script tag), `backend/requirements.txt`
**Deprecated:** `backend/server.py` (logic moved into `app.py` + `predictions.py`, exact same endpoints/behavior)
**Added:** `.gitignore` (protects `.env` and the SQLite database file)

### Authentication
- **Registration** (`POST /api/auth/register`): validates name/email/password server-side, normalizes email (trim + lowercase), rejects duplicates with a clear 409 error, hashes the password with bcrypt, inserts into SQLite.
- **Login** (`POST /api/auth/login`): looks up by email, verifies with `bcrypt.checkpw`, starts a session, updates `last_login`. Returns a generic "Invalid email or password" for both wrong password and unknown email (doesn't leak which).
- **Logout** (`POST /api/auth/logout`): clears the server-side session.
- **Session check** (`GET /api/auth/me`): tells the frontend whether the browser is currently authenticated, and as which user.
- **Google Sign-In** (`GET /api/auth/google`, `GET /api/auth/google/callback`): OpenID Connect flow via Authlib. On callback: if a `google_id` match exists → log in; else if a local account exists with that email → link the Google identity to it (no duplicate); else → create a new `auth_provider='google'` user.
- **Session mechanism:** Flask's signed cookie session (itsdangerous + `SECRET_KEY`), `HttpOnly`, `SameSite=Lax`, `Secure` in production. The cookie only stores a user id — never a password or hash — and frontend JS can't read or forge it.

### Database
- **Engine:** SQLite (file: `backend/smartcity.db`), zero external services to install.
- **Table:** `users` — `id, name, email (unique), password_hash, auth_provider ('local'|'google'), google_id (unique), profile_image, is_active, created_at, updated_at, last_login`.
- Verified persistence by killing the backend process and restarting it against the same `.db` file, then logging in successfully — proves it survives backend restarts, and the same holds for browser/computer restarts since it's disk-backed.

### Security
- Passwords hashed with **bcrypt** (never stored, logged, or returned in plaintext — verified no response body ever contains `password` or `password_hash`).
- Secrets (`SECRET_KEY`, `GOOGLE_CLIENT_SECRET`, DB path) come only from environment variables via `.env` (git-ignored); `.env.example` ships placeholders only.
- CORS is locked to your specific frontend origin with credentials support — not a wildcard `*`.
- Duplicate-email protection, generic login error messages, and case-insensitive/trimmed email normalization are all enforced server-side (not just in the UI).

### Environment Variables
See `backend/.env.example`. Copy it to `backend/.env` and fill in:
```
PORT, FLASK_ENV, DATABASE_PATH, SECRET_KEY,
FRONTEND_ORIGIN, FRONTEND_APP_URL, FRONTEND_LOGIN_URL,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
```
Generate a real `SECRET_KEY` with:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### How to Run
```bash
# Portable mode: one server for the API and the complete website
cd backend
cp .env.example .env          # then edit .env — at minimum set SECRET_KEY
pip install -r requirements.txt
python app.py                  # → http://localhost:8765
```
Open this URL in Chrome or Edge:
```text
http://localhost:8765/
```

The separate frontend preview remains supported when you need it:
```bash
# Optional two-server development mode

cd frontend
python -m http.server 5500     # → http://localhost:5500

# Open in browser
http://localhost:5500/login.html
```

### Free deployment with durable data

The Render free filesystem is temporary, so SQLite data is not suitable for
production there. The backend automatically uses PostgreSQL when `DATABASE_URL`
is set and keeps SQLite for local development.

1. Create a free PostgreSQL database at [Supabase](https://supabase.com/) or
   [Neon](https://neon.tech/) and copy its connection string.
2. In Render, create a **Web Service** from the `Sameer0605/Smartcity`
   repository and use:
   - Build command: `pip install -r requirements.txt`
   - Start command:
     `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT`
   - Plan: `Free`
3. Add these Render environment variables:
   ```
   FLASK_ENV=production
   SECRET_KEY=<long-random-secret>
   DATABASE_URL=<managed-postgresql-connection-string>
   FRONTEND_ORIGIN=https://<your-service>.onrender.com
   FRONTEND_APP_URL=https://<your-service>.onrender.com/app/
   FRONTEND_LOGIN_URL=https://<your-service>.onrender.com/login.html
   ```
4. Deploy and verify:
   `https://<your-service>.onrender.com/api/health`

Supabase/Neon preserves users and analytics across Render restarts and
redeployments. The Render service may still sleep when idle on the free plan,
so the first request after inactivity can take longer.

### Google OAuth Setup (required before "Continue with Google" will work)
Until you complete this, clicking the button redirects back to login with a clear "not configured" message — it never fakes success.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → OAuth consent screen** → configure it (External, add your email as a test user while in testing mode).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application**.
4. Under **Authorized redirect URIs**, add exactly:
   `http://localhost:8765/api/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret** into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
6. Restart the backend (`python app.py`). The startup banner will now print `Google OAuth configured: True`.

### Testing — what was actually verified (not just claimed)
Ran real HTTP requests end-to-end against a live backend + live frontend server with proper `Origin`/CORS/cookie handling:
- ✅ Existing prediction endpoints (`/health`, `/predict/all`, `/predict/range`, `/predict/zones`, `/recommendations`) — unchanged, still working
- ✅ Register → row created in SQLite, password stored as a genuine bcrypt hash (never plaintext)
- ✅ Duplicate email registration → rejected (409), no duplicate row created
- ✅ Weak password / mismatched confirm-password → rejected server-side (400)
- ✅ Login with wrong password → rejected (401), no session created
- ✅ Login with correct password → session cookie set (`HttpOnly`, confirmed via cookie jar inspection)
- ✅ `/api/auth/me` correctly reflects the logged-in user
- ✅ Logout → session cleared, `/api/auth/me` reverts to `authenticated: false`
- ✅ Login again with the same account → works
- ✅ **Backend process killed and restarted**, then logged in again against the same database file → proves real persistence
- ✅ No response body ever includes a password or password hash
- ⚠️ **Google Sign-In was not end-to-end tested** — no Google OAuth credentials were available in this environment. The code path is implemented and the "not configured" fallback was verified to fail cleanly and honestly rather than faking a login. You'll need to complete the Google Cloud Console setup above and test that flow yourself.


> AI-powered Smart City prediction system using Machine Learning to forecast
> traffic, air quality, and population growth for 20 major Indian cities
> from year 2000 to 2100.

---

## 📁 Project Structure

```
SmartCityAI/
│
├── frontend/                    ← Open in browser (no build step needed)
│   ├── index.html               ← Main entry point
│   ├── css/
│   │   ├── theme.css            ← CSS variables, light/dark tokens, fonts
│   │   ├── layout.css           ← Sidebar, topbar, navigation
│   │   └── components.css       ← Cards, KPIs, maps, AI panel, boot screen
│   └── js/
│       ├── data.js              ← City database + fallback ML engine
│       ├── state.js             ← Global app state (S object)
│       ├── api.js               ← Backend API calls + fallback logic
│       ├── display.js           ← KPI update + animated gauges
│       ├── map.js               ← Google Maps embed + explorer
│       ├── charts.js            ← Chart.js visualisations
│       ├── ai.js                ← AI Advisor + risk assessment
│       └── app.js               ← Navigation, controls, boot, theme
│
├── backend/
│   ├── server.py                ← Python HTTP server (no pip needed)
│   ├── ml_models.py             ← scikit-learn ML (optional upgrade)
│   └── requirements.txt         ← Python dependencies
│
└── README.md                    ← This file
```

---

## 🚀 How to Run

### Option 1 — Frontend Only (Works Offline)
```
Just open:  frontend/index.html  in any browser
```
The app runs entirely in the browser using a fallback ML engine (same
algorithm as the Python backend, implemented in JavaScript).

### Option 2 — With Python Backend (Full ML)
```bash
# 1. Start the backend
cd backend
python server.py

# 2. Open frontend
Open frontend/index.html in browser
```
Backend runs at `http://localhost:8765`

### Option 3 — With scikit-learn Models (Advanced)
```bash
# Install dependencies
pip install numpy scikit-learn pandas

# Train models (first time only)
cd backend
python ml_models.py

# Start server
python server.py
```

---

## 🧠 ML Models Explained

| Model | Algorithm | Accuracy | Best For |
|-------|-----------|----------|----------|
| **LSTM** | Gradient Boosting (sigmoid-weighted growth) | ~95% | Long-term non-linear trends |
| **RF** | Random Forest (5 growth-stage ensemble) | ~88% | Medium-term with stage shifts |
| **LR** | Ridge Regression (linear projection) | ~72% | Short-term linear forecasts |

---

## 📊 Features

| Feature | Description |
|---------|-------------|
| 🏙️ 20 Cities | Mumbai, Delhi, Bangalore, Hyderabad, Chennai + 15 more |
| 📅 2000–2100 | 100-year prediction range |
| 🚦 Traffic | Urban traffic congestion index |
| 💨 Air Quality | AQI (Air Quality Index) |
| 👥 Population | City population in millions |
| 🗺️ Google Maps | Embedded satellite/terrain/street view |
| 📸 Explorer | Famous places with Wikipedia photos |
| 🤖 AI Advisor | Smart city recommendations + risk assessment |
| 🌙 Dark Mode | Full dark/light theme toggle |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server status |
| GET | `/cities` | List of cities |
| GET | `/predict/all?city=Mumbai&year=2050&model=LSTM` | Full prediction |
| GET | `/predict/range?city=Delhi&feature=traffic&model=RF` | Time series |
| GET | `/predict/zones?city=Chennai&year=2040` | Zone breakdown |
| GET | `/models/metrics?city=Kolkata` | Model accuracy |
| GET | `/recommendations?city=Mumbai&year=2025&model=LSTM` | AI recommendations |

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|------------|
| HTML | Semantic HTML5 |
| CSS | CSS Custom Properties (variables), Glassmorphism, Animations |
| JavaScript | Vanilla JS ES2022 (no framework) |
| Charts | Chart.js 4.4.0 |
| Maps | Google Maps Embed API |
| Fonts | Poppins, Inter, JetBrains Mono (Google Fonts) |
| Backend | Python 3 stdlib `http.server` |
| ML | Custom formula-based + optional scikit-learn |

---

## 👨‍💻 How to Present to Mentor

1. **Open** `frontend/index.html` in Chrome
2. **Select** any city from the dropdown (e.g., Mumbai)
3. **Select** a year (e.g., 2050) and click **Run Prediction**
4. **Show** KPI cards animating with population, traffic, AQI, green cover
5. **Click** Map View → shows Google Maps with overlays
6. **Click** Analytics → shows 100-year trend charts
7. **Click** ML Forecast → compare LSTM vs RF vs LR models
8. **Click** AI Advisor → shows risk assessment + recommendations
9. **Explain** the backend: `cd backend && python server.py`
10. **Show** VS Code file structure → explain each file's role

---

## 📌 Key Design Decisions

- **No framework** — Pure HTML/CSS/JS for learning clarity and no build step
- **Offline fallback** — App works without backend using same ML formula in JS
- **Modular JS** — Each concern in its own file (MVC-like separation)
- **SPA behaviour** — No page reloads; sidebar nav switches views smoothly
- **Real maps** — Google Maps embed (no API key for basic use)

---

*SmartCity AI — India Urban Intelligence Platform · v4.0*
