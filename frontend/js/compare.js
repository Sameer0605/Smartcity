/**
 * compare.js — City Comparison Module
 * SmartCity AI · India Urban Intelligence
 *
 * compareInit()        — populate city dropdowns and year selector
 * onCmpSelectionChange() — clear results when selections change (no auto-compare)
 * onCmpCompare()       — triggered by Compare button with validation + loading
 * _cmpRender()         — builds KPI cards, charts, comparison table, and summary
 */

/* ══════════════ INIT ══════════════ */

let _cmpChartBar = null;
let _cmpChartLine = null;
let _cmpHasResults = false;

function compareInit() {
  const cities = Object.keys(CITIES).sort();
  ['cmpCityA', 'cmpCityB'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    cities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  });

  const yearSel = document.getElementById('cmpYear');
  if (yearSel) {
    const cur = new Date().getFullYear();
    // Add placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Select Year —';
    placeholder.disabled = true;
    yearSel.appendChild(placeholder);
    for (let y = cur; y <= 2100; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    }
  }

  // Pre-select City A from the global state if available
  if (S.city) {
    const selA = document.getElementById('cmpCityA');
    if (selA) { selA.value = S.city; }
  }
}

/* ══════════════ SELECTION CHANGE (no auto-compare) ══════════════ */

function onCmpSelectionChange() {
  // When user changes any selection, hide previous results
  if (_cmpHasResults) {
    document.getElementById('cmpResults').style.display = 'none';
    document.getElementById('cmpEmpty').style.display = 'flex';
    _cmpHasResults = false;
  }
}

/* ══════════════ COMPARE BUTTON ══════════════ */

async function onCmpCompare() {
  const a = document.getElementById('cmpCityA')?.value;
  const b = document.getElementById('cmpCityB')?.value;
  const y = parseInt(document.getElementById('cmpYear')?.value) || new Date().getFullYear();

  // Validation
  if (!a) {
    showToast('Please select City A.', 'warning');
    return;
  }
  if (!b) {
    showToast('Please select City B.', 'warning');
    return;
  }
  if (a === b) {
    showToast('Please select two different cities.', 'warning');
    return;
  }

  // Show loading state
  const btn = document.getElementById('cmpBtn');
  const btnIcon = document.getElementById('cmpBtnIcon');
  const btnText = document.getElementById('cmpBtnText');
  const emptyEl = document.getElementById('cmpEmpty');
  const loadingEl = document.getElementById('cmpLoading');
  const resultsEl = document.getElementById('cmpResults');

  if (btn) btn.disabled = true;
  if (btnIcon) btnIcon.textContent = '⏳';
  if (btnText) btnText.textContent = 'Analyzing...';
  if (emptyEl) emptyEl.style.display = 'none';
  if (resultsEl) resultsEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'block';

  // Simulate brief processing delay for UX
  await new Promise(r => setTimeout(r, 400));

  try {
    // Fetch predictions for both cities in parallel
    const [dA, dB] = await Promise.all([
      fetchPred(a, y, S.model),
      fetchPred(b, y, S.model),
    ]);

    _cmpRender(a, b, y, dA, dB);
    _cmpHasResults = true;

    if (loadingEl) loadingEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'block';
  } catch (err) {
    showToast('Error fetching comparison data. Please try again.', 'error');
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'flex';
  } finally {
    if (btn) btn.disabled = false;
    if (btnIcon) btnIcon.textContent = '⚖️';
    if (btnText) btnText.textContent = 'Compare Cities';
  }
}

/* ══════════════ RENDER ══════════════ */

function _cmpRender(a, b, year, dA, dB) {
  // ── KPI Cards ──
  _renderCmpKpi('cmpKpiA', a, dA, 'a');
  _renderCmpKpi('cmpKpiB', b, dB, 'b');

  // ── Table headers ──
  const thA = document.getElementById('cmpThA');
  const thB = document.getElementById('cmpThB');
  const meta = document.getElementById('cmpTableMeta');
  if (thA) thA.textContent = a;
  if (thB) thB.textContent = b;
  if (meta) meta.textContent = `${a} vs ${b} · ${year} · ${S.model}`;

  // ── Comparison table ──
  _renderCmpTable(a, b, year, dA, dB);

  // ── Charts ──
  _renderCmpCharts(a, b, year);

  // ── Summary ──
  _renderCmpSummary(a, b, year, dA, dB);
}

function _renderCmpKpi(containerId, city, pred, label) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const gi = greenIdx(city, new Date().getFullYear());
  const items = [
    { lbl: 'Population', val: pred.p.toFixed(2) + 'M', raw: pred.p, max: 60, color: '#7c3aed', icon: '👥' },
    { lbl: 'Traffic Index', val: pred.t.toFixed(1), raw: pred.t, max: 150, color: '#6366f1', icon: '🚦' },
    { lbl: 'AQI', val: pred.a.toFixed(0), raw: pred.a, max: 300, color: '#f97316', icon: '💨' },
    { lbl: 'Green Cover', val: gi.toFixed(0), raw: gi, max: 65, color: '#16a34a', icon: '🌿' },
  ];

  // Icon SVGs for each metric
  const icons = {
    'Population': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'Traffic Index': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="18" r="2" fill="currentColor"/></svg>',
    'AQI': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 8c.8 0 1.5-.7 1.5-1.5S19.3 5 18.5 5 17 5.7 17 6.5 17.7 8 18.5 8z"/><path d="M12 20c-4.4 0-8-3.6-8-8 0-3.3 2-6.2 5-7.4"/><path d="M12 20c4.4 0 8-3.6 8-8 0-3.3-2-6.2-5-7.4"/><path d="M12 20v-8"/></svg>',
    'Green Cover': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8c.7-1 1.5-2.2 2-3.5C17.5 3.5 15 3 13 4c-1.5.7-2.5 2-3 3.5C9 6 7.5 5 6 4.5 4 4 2 5 2 8c0 3 2 5 4 6 .5.3 1 .7 1.5 1"/><path d="M12 16c-4 0-7-2-7-5 0-2 1.5-3.5 3-4"/><path d="M12 16c4 0 7-2 7-5 0-2-1.5-3.5-3-4"/><path d="M12 16v6"/></svg>'
  };

  el.innerHTML = `
    <div class="cmp-city-badge ${label}">${label === 'a' ? '🅰️' : '🅱️'} ${city}</div>
    ${items.map(it => {
      return `<div class="kpi-card" style="border-left:3px solid ${it.color};">
        <div class="kpi-left">
          <div class="kpi-lbl">${it.lbl}</div>
          <div class="kpi-val" style="color:${it.color};font-size:20px;">${it.val}</div>
        </div>
        <div class="kpi-icon" style="background:${it.color}15;color:${it.color};">
          ${icons[it.lbl] || ''}
        </div>
      </div>`;
    }).join('')}
  `;
}

function _renderCmpTable(a, b, year, dA, dB) {
  const body = document.getElementById('cmpBody');
  if (!body) return;

  const metrics = [
    { name: 'Population (M)', a: dA.p, b: dB.p, fmt: v => v.toFixed(2), better: 'lower' },
    { name: 'Traffic Index', a: dA.t, b: dB.t, fmt: v => v.toFixed(1), better: 'lower' },
    { name: 'AQI', a: dA.a, b: dB.a, fmt: v => v.toFixed(0), better: 'lower' },
    { name: 'Green Cover', a: greenIdx(a, year), b: greenIdx(b, year), fmt: v => v.toFixed(0), better: 'higher' },
  ];

  body.innerHTML = metrics.map(m => {
    const delta = m.b - m.a;
    const absDelta = Math.abs(delta);
    const deltaClass = absDelta < 0.5 ? 'neu' : (delta > 0 ? (m.better === 'lower' ? 'pos' : 'neg') : (m.better === 'lower' ? 'neg' : 'pos'));
    const winner = absDelta < 0.5 ? 'tie' : (delta > 0 ? (m.better === 'lower' ? 'a' : 'b') : (m.better === 'lower' ? 'b' : 'a'));
    const winnerLabel = winner === 'tie' ? 'Tie' : winner === 'a' ? a : b;
    return `<tr>
      <td style="font-weight:600;color:var(--text-1);">${m.name}</td>
      <td style="font-weight:700;color:#6366f1;">${m.fmt(m.a)}</td>
      <td style="font-weight:700;color:#f97316;">${m.fmt(m.b)}</td>
      <td><span class="cmp-delta ${deltaClass}">${delta > 0 ? '+' : ''}${m.fmt(delta)}</span></td>
      <td><span class="cmp-winner ${winner}">${winnerLabel}</span></td>
    </tr>`;
  }).join('');
}

function _renderCmpCharts(cityA, cityB, year) {
  if (typeof Chart === 'undefined') return;

  // ── Bar chart: Traffic + AQI side by side ──
  const ctxBar = document.getElementById('c-cmp-bar');
  if (ctxBar) {
    if (_cmpChartBar) _cmpChartBar.destroy();
    _cmpChartBar = new Chart(ctxBar.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Traffic Index', 'AQI', 'Population (×5)'],
        datasets: [
          {
            label: cityA,
            data: [
              fb(cityA, year, 'traffic', S.model),
              fb(cityA, year, 'aqi', S.model),
              fb(cityA, year, 'population', S.model) * 5,
            ],
            backgroundColor: 'rgba(99,102,241,.7)',
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            label: cityB,
            data: [
              fb(cityB, year, 'traffic', S.model),
              fb(cityB, year, 'aqi', S.model),
              fb(cityB, year, 'population', S.model) * 5,
            ],
            backgroundColor: 'rgba(249,115,22,.7)',
            borderColor: '#f97316',
            borderWidth: 2,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { boxWidth: 10, padding: 16, usePointStyle: true, font: { size: 11, weight: '600' } } },
          tooltip: { backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#e2e8f0', borderWidth: 1, titleColor: '#0f172a', bodyColor: '#334155', padding: 12, cornerRadius: 10 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  // ── Line chart: Population growth trajectory ──
  const ctxLine = document.getElementById('c-cmp-line');
  if (ctxLine) {
    if (_cmpChartLine) _cmpChartLine.destroy();
    const cur = new Date().getFullYear();
    const labels = [];
    const dataA = [];
    const dataB = [];
    for (let y = cur; y <= 2100; y += 5) {
      labels.push(y);
      dataA.push(+(fb(cityA, y, 'population', S.model)).toFixed(2));
      dataB.push(+(fb(cityB, y, 'population', S.model)).toFixed(2));
    }
    _cmpChartLine = new Chart(ctxLine.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: cityA,
            data: dataA,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,.08)',
            borderWidth: 2.5,
            tension: 0.45,
            pointRadius: 0,
            fill: true,
          },
          {
            label: cityB,
            data: dataB,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,.08)',
            borderWidth: 2.5,
            tension: 0.45,
            pointRadius: 0,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { boxWidth: 10, padding: 16, usePointStyle: true, font: { size: 11, weight: '600' } } },
          tooltip: { backgroundColor: 'rgba(255,255,255,.98)', borderColor: '#e2e8f0', borderWidth: 1, titleColor: '#0f172a', bodyColor: '#334155', padding: 12, cornerRadius: 10 },
        },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, callback: v => v.toFixed(1) + 'M' } },
        },
      },
    });
  }
}

/* ══════════════ COMPARISON SUMMARY ══════════════ */

function _renderCmpSummary(a, b, year, dA, dB) {
  const el = document.getElementById('cmpSummary');
  if (!el) return;

  const giA = greenIdx(a, year);
  const giB = greenIdx(b, year);

  const popWinner = dA.p > dB.p ? a : dB.p > dA.p ? b : null;
  const trafWinner = dA.t < dB.t ? a : dB.t < dA.t ? b : null;
  const aqiWinner = dA.a < dB.a ? a : dB.a < dA.a ? b : null;
  const greenWinner = giA > giB ? a : giB > giA ? b : null;

  const lines = [];
  if (popWinner) {
    lines.push(`<div style=\"margin-bottom:6px;\"><b style=\"color:var(--text-1)\">Population:</b> ${popWinner} has the larger projected population at ${Math.max(dA.p, dB.p).toFixed(2)}M.</div>`);
  } else {
    lines.push(`<div style=\"margin-bottom:6px;\"><b style=\"color:var(--text-1)\">Population:</b> Both cities have similar population projections.</div>`);
  }
  if (trafWinner) {
    lines.push(`<div style=\"margin-bottom:6px;\"><b style=\"color:var(--text-1)\">Traffic:</b> ${trafWinner} has lower traffic congestion (index ${Math.min(dA.t, dB.t).toFixed(1)}).</div>`);
  } else {
    lines.push(`<div style=\"margin-bottom:6px;\"><b style=\"color:var(--text-1)\">Traffic:</b> Both cities have similar traffic levels.</div>`);
  }
  if (aqiWinner) {
    lines.push(`<div style=\"margin-bottom:6px;\"><b style=\"color:var(--text-1)\">Air Quality:</b> ${aqiWinner} has better air quality (AQI ${Math.min(dA.a, dB.a).toFixed(0)}).</div>`);
  } else {
    lines.push(`<div style=\"margin-bottom:6px;\"><b style=\"color:var(--text-1)\">Air Quality:</b> Both cities have similar AQI levels.</div>`);
  }
  if (greenWinner) {
    lines.push(`<div><b style=\"color:var(--text-1)\">Green Cover:</b> ${greenWinner} has higher green cover (${Math.max(giA, giB).toFixed(0)}%).</div>`);
  } else {
    lines.push(`<div><b style=\"color:var(--text-1)\">Green Cover:</b> Both cities have similar green cover.</div>`);
  }

  el.innerHTML = lines.join('');
}
