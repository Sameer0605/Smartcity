/**
 * auth-guard.js — SmartCity AI
 * Runs on every load of the authenticated app (/app/).
 *
 *  - Calls GET /api/auth/me to find out if this browser has a valid session.
 *  - Not authenticated  → redirect to /login.html immediately.
 *  - Authenticated      → personalize the navbar (name/avatar) with the
 *                          real logged-in user, and wire real logout.
 */

const AUTH_API = API || (window.SMARTCITY_API_BASE || 'http://localhost:8765');
const LANDING_URL = '/';
const LOGIN_URL = '/login.html';
const APP_URL = '/app/';
window.CURRENT_USER = null;

function initials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function setAvatarEl(el, user) {
  if (!el) return;
  el.innerHTML = '';
  if (user.profileImage) {
    const img = document.createElement('img');
    img.src = user.profileImage;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
    el.appendChild(img);
  } else {
    el.textContent = initials(user.name);
  }
}

function applyUserToUI(user) {
  document.querySelectorAll('.profile-trigger-avatar, .profile-avatar-lg').forEach(el => setAvatarEl(el, user));
  document.querySelectorAll('.profile-trigger-name, .profile-name').forEach(el => { el.textContent = user.name; });
  document.querySelectorAll('.profile-trigger-role, .profile-role').forEach(el => { el.textContent = user.email; });

  const btn = document.getElementById('profileBtn');
  if (btn) btn.title = user.name;

  // Wire the existing "Sign Out" item to a real logout call
  document.querySelectorAll('.profile-item-danger').forEach(el => {
    el.onclick = async () => {
      try {
        await fetch(AUTH_API + '/api/auth/logout', { method: 'POST', credentials: 'include', signal: AbortSignal.timeout(5000) });
      } catch (e) { /* even if this fails, still send them to login */ }
      window.location.replace(LOGIN_URL);
    };
  });
}

async function checkAuthAndInit() {
  try {
    const r = await fetch(AUTH_API + '/api/auth/me', { credentials: 'include', signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (!d.authenticated) {
      window.location.replace(LOGIN_URL);
      return;
    }
    window.CURRENT_USER = d.user;
    applyUserToUI(d.user);
    if (typeof populateSettings === 'function') populateSettings(d.user);
  } catch (e) {
    // Backend unreachable — let the user stay on the page.
    // The sidebar will show "Backend: offline" and the fallback ML engine
    // in data.js provides predictions without the backend.
    console.warn('auth-guard: backend unreachable, running in offline mode', e);
  }
}

checkAuthAndInit();
