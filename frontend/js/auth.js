/**
 * auth.js — SmartCity AI
 * Shared logic for login.html and register.html.
 * Talks to the Flask backend at API (http://localhost:8765).
 */

const API = window.SMARTCITY_API_BASE || (window.location.protocol === 'http:' && window.location.port !== '5500' ? window.location.origin : 'http://localhost:8765');

function showBanner(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = 'banner show ' + (type === 'success' ? 'banner-success' : 'banner-error');
}

function hideBanner(el) {
  if (!el) return;
  el.className = 'banner';
}

function fieldError(inputEl, errEl, message) {
  if (message) {
    inputEl.classList.add('field-error');
    if (errEl) { errEl.textContent = message; errEl.classList.add('show'); }
    return false;
  }
  inputEl.classList.remove('field-error');
  if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }
  return true;
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function setLoading(btn, spinnerEl, textEl, loadingText, isLoading, idleText) {
  btn.disabled = isLoading;
  if (spinnerEl) spinnerEl.classList.toggle('show', isLoading);
  if (textEl) textEl.textContent = isLoading ? loadingText : idleText;
}

function togglePasswordField(inputEl, toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const show = inputEl.type === 'password';
    inputEl.type = show ? 'text' : 'password';
    toggleBtn.textContent = show ? 'Hide' : 'Show';
  });
}

async function postJSON(path, body) {
  const TIMEOUT_MS = 8000; // 8s for auth actions (registration may be slower)
  try {
    const res = await fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* server returned non-JSON */ }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    // Network error, timeout, or CORS issue
    let msg = 'Unable to connect to SmartCityAI server. Please try again.';
    if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
      msg = 'Server took too long to respond. Please try again.';
    } else if (err.name === 'AbortError') {
      msg = 'Request was cancelled.';
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      msg = 'Cannot reach the backend server. Is it running?';
    }
    return { ok: false, status: 0, data: { success: false, error: msg } };
  }
}

/* ── Password strength meter (register page) ───────────────────── */
function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

function updateStrengthMeter(pw, bars, label) {
  const score = pw ? scorePassword(pw) : 0;
  const colors = ['#dc2626', '#f59e0b', '#eab308', '#22c55e'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  bars.forEach((bar, i) => {
    bar.style.background = i < score ? colors[Math.max(score - 1, 0)] : '#E3EAF2';
  });
  label.textContent = pw ? labels[Math.max(score - 1, 0)] : '';
}

/* ── If the browser already has a valid session, skip straight to the app ── */
async function redirectIfAlreadyAuthenticated() {
  try {
    const r = await fetch(API + '/api/auth/me', {
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json();
    if (d.authenticated) window.location.replace('/app/');
  } catch (e) { /* backend offline — let them log in normally */ }
}

/* ── Handle ?error=... coming back from a failed Google OAuth redirect ── */
function readGoogleErrorFromUrl(bannerEl) {
  const params = new URLSearchParams(window.location.search);
  const err = params.get('error');
  if (!err) return;
  const messages = {
    google_failed: 'Google sign-in could not be completed. Please try again.',
    google_not_configured: 'Google sign-in is not configured yet on this server.',
    google_unverified: 'Google sign-in could not be completed. Please try again.',
  };
  showBanner(bannerEl, messages[err] || 'Google sign-in could not be completed. Please try again.', 'error');
  // Clean the URL so refreshing doesn't re-show the error
  window.history.replaceState({}, '', window.location.pathname);
}

function goToGoogle(btn, spinner, textEl) {
  setLoading(btn, spinner, textEl, 'Connecting to Google...', true, 'Continue with Google');
  window.location.href = API + '/api/auth/google';
}
