/**
 * api.js — Backend Communication & Fallback
 * SmartCity AI · India Urban Intelligence
 *
 * apiFetch(path, opts)        — fetch with retry + exponential backoff
 * postJSON(path, body, opts)  — POST with timeout + retry
 * setApiStatus(ok, ms)        — update sidebar status dot
 * fetchPred(city,year,model)  — prediction (API or fallback)
 * fetchRange(city,feat,model) — time series for charts
 * fetchZones(city,year,model) — zone predictions
 */

/* ══════════════ CONSTANTS ══════════════ */
const _API_TIMEOUT_MS   = 3000;   // 3s per attempt (was 1.5s — too aggressive)
const _API_MAX_RETRIES  = 2;      // total attempts = retries + 1 = 3
const _BACKOFF_BASE_MS  = 400;    // first retry delay
const _BACKOFF_MAX_MS   = 2000;   // cap retry delay
let _lastToastTime = 0;           // dedup: prevent multiple toasts within 3s
const _TOAST_COOLDOWN_MS = 3000;

/* ══════════════ HELPERS ══════════════ */

/** Exponential backoff delay in ms */
function _backoffDelay(attempt) {
  const ms = Math.min(_BACKOFF_BASE_MS * Math.pow(2, attempt), _BACKOFF_MAX_MS);
  return ms + Math.random() * 150; // jitter
}

/** Classify an error into a user-friendly category */
function _classifyError(err) {
  if (!err) return 'unknown';
  if (err.name === 'TimeoutError' || err.message?.includes('timeout')) return 'timeout';
  if (err.name === 'AbortError') return 'aborted';
  if (err.message?.includes('NetworkError') || err.message?.includes('Failed to fetch')
      || err.message?.includes('NetworkError') || err.message?.includes('ERR_NETWORK')
      || err.message?.includes('ERR_CONNECTION')) return 'network';
  return 'server';
}

/** Friendly message per error category */
const _ERROR_MESSAGES = {
  timeout:  'Server took too long to respond.',
  network:  'Cannot reach the backend server.',
  server:   'Backend returned an error.',
  aborted:  'Request was cancelled.',
  unknown:  'An unexpected error occurred.',
};

/* ══════════════ CORE FETCH ══════════════ */

/**
 * apiFetch(path, opts)
 * @param {string}  path          — API path (e.g. '/predict/all?city=...')
 * @param {object}  [opts]
 * @param {number}  [opts.retries]      — override max retries (default _API_MAX_RETRIES)
 * @param {number}  [opts.timeoutMs]    — override per-attempt timeout (default _API_TIMEOUT_MS)
 * @param {boolean} [opts.silent]       — suppress fallback toast
 * @returns {Promise<object|null>}      — parsed JSON or null on failure
 */
async function apiFetch(path, opts) {
  const maxRetries = (opts && opts.retries != null) ? opts.retries : _API_MAX_RETRIES;
  const timeoutMs  = (opts && opts.timeoutMs != null) ? opts.timeoutMs : _API_TIMEOUT_MS;
  const silent     = (opts && opts.silent) || false;

  let lastErr = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const t0 = performance.now();
    try {
      const r = await fetch(API + path, { signal: AbortSignal.timeout(timeoutMs) });
      const ms = Math.round(performance.now() - t0);

      // Treat non-2xx as a failure worth retrying (except 4xx client errors — don't retry those)
      if (!r.ok && r.status >= 500) {
        throw new Error(`HTTP ${r.status}`);
      }
      if (!r.ok) {
        // Client error (4xx) — return null without retrying
        setApiStatus(false, ms);
        return null;
      }

      const d = await r.json();
      setApiStatus(true, ms);
      return d;
    } catch (err) {
      lastErr = err;
      // Don't retry client aborts
      if (err.name === 'AbortError' && !err.message?.includes('timeout')) break;
      // Backoff before next attempt (skip on last iteration)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, _backoffDelay(attempt)));
      }
    }
  }

  // All retries exhausted
  setApiStatus(false);

  // Dedup: only show toast if enough time since last one
  const now = Date.now();
  if (!silent && typeof showToast === 'function' && (now - _lastToastTime) > _TOAST_COOLDOWN_MS) {
    _lastToastTime = now;
    const category = _classifyError(lastErr);
    showToast(`${_ERROR_MESSAGES[category]} Using offline predictions.`, 'warning', 5000);
  }
  return null;
}

/**
 * postJSON(path, body, opts)
 * @param {string} path     — API path
 * @param {object} body     — JSON body
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]  — override timeout
 * @returns {Promise<{ok:boolean, status:number, data:object}>}
 */
async function postJSON(path, body, opts) {
  const timeoutMs = (opts && opts.timeoutMs != null) ? opts.timeoutMs : _API_TIMEOUT_MS;
  const maxRetries = (opts && opts.retries != null) ? opts.retries : 0; // no retry by default for mutations

  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      let data = {};
      try { data = await res.json(); } catch (e) { /* server returned non-JSON */ }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, _backoffDelay(attempt)));
      }
    }
  }

  // All attempts failed — return a structured error so callers can show a message
  const category = _classifyError(lastErr);
  return {
    ok: false,
    status: 0,
    data: { success: false, error: _ERROR_MESSAGES[category] || 'Unable to connect to server.' },
  };
}

/* ══════════════ API STATUS ══════════════ */
function setApiStatus(ok, ms) {
  S.apiOk = ok;
  const dot   = document.getElementById('apiDot');
  const label = document.getElementById('apiLabel');
  const msEl  = document.getElementById('apiMs');
  const stApi = document.getElementById('st-api');
  if (dot)   dot.className = 'api-dot' + (ok ? ' ok' : ' err');
  if (label) label.textContent = ok ? 'Backend: online' : 'Backend: offline';
  if (msEl)  msEl.textContent = ok ? (ms != null ? ms + 'ms' : '') : '';
  if (stApi) stApi.textContent = ok ? 'API: online ✓' : 'API: fallback';
}

/* ══════════════ PREDICTION FETCHERS ══════════════ */

async function fetchPred(city, year, model) {
  const d = await apiFetch(`/predict/all?city=${city}&year=${year}&model=${model}`, { silent: true, timeoutMs: 8000, retries: 1 });
  if (d && d.predictions) {
    return {
      t: d.predictions.traffic.value,
      a: d.predictions.aqi.value,
      p: d.predictions.population.value,
    };
  }
  // Offline fallback — compute locally
  return {
    t: fb(city, year, 'traffic', model),
    a: fb(city, year, 'aqi', model),
    p: fb(city, year, 'population', model),
  };
}

async function fetchRange(city, feat, model) {
  const startYear = new Date().getFullYear();
  const d = await apiFetch(
    `/predict/range?city=${city}&year_start=${startYear}&year_end=2100&step=1&feature=${feat}&model=${model}`,
    { silent: true }
  );
  if (d && d.series) return d.series;
  // Offline fallback
  const o = [];
  for (let y = startYear; y <= 2100; y++) o.push({ year: y, value: fb(city, y, feat, model) });
  return o;
}

async function fetchZones(city, year, model) {
  const d = await apiFetch(`/predict/zones?city=${city}&year=${year}&model=${model}`, { silent: true });
  if (d && d.zones) return d.zones;
  // Offline fallback — always compute fresh (never use S.pred which may be 0 on first load)
  const c  = CITIES[city];
  const bt = fb(city, year, 'traffic', model);
  const ba = fb(city, year, 'aqi', model);
  const bp = fb(city, year, 'population', model);
  // Seeded RNG for deterministic zone results (matching backend behaviour)
  const rng = (function (seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  })(_hashStr(city + year + 'zones' + model));

  return ZONES.map(z => {
    const zt = +(bt * z.tm * (1 + (rng() - .5) * .06)).toFixed(1);
    const za = +(ba * z.am * (1 + (rng() - .5) * .06)).toFixed(0);
    const zp = +(bp * z.pm * (1 + (rng() - .5) * .04)).toFixed(3);
    const rs = +Math.min(100, (zt / 1.5 + za / 3.5) / 2).toFixed(1);
    const rl = rs > 75 ? 'CRITICAL' : rs > 55 ? 'HIGH' : rs > 35 ? 'MEDIUM' : 'LOW';
    return {
      name: z.n, lat: c.lat + z.lo, lng: c.lng + z.go,
      traffic: zt, aqi: za, population: zp, risk_score: rs, risk_level: rl,
    };
  });
}
