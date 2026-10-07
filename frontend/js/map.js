/**
 * map.js — SmartCityAI Map View — Premium AI/GIS Dashboard
 * Google Maps Embed + AI Prediction Panel + Analysis Overlays
 *
 * PERSISTENT STATE:
 *   mapMode: 'standard' | 'analysis'
 *   selectedOverlay: 'traffic' | 'aqi' | 'population' | 'risk'
 *   baseMapType: 'default' | 'satellite' | 'terrain'
 *   S.city, S.year, S.model — from global state
 */

/* ══════════════ MAP STATE ══════════════ */
let mapMode = 'standard';
let selectedOverlay = 'traffic';
let baseMapType = 'default';
let _mapInfoOpen = false;

// City coordinates
const CITY_COORDS = {
  Mumbai:{la:19.0760,lo:72.8777},Delhi:{la:28.6139,lo:77.2090},
  Bangalore:{la:12.9716,lo:77.5946},Hyderabad:{la:17.3850,lo:78.4867},
  Chennai:{la:13.0827,lo:80.2707},Kolkata:{la:22.5726,lo:88.3639},
  Pune:{la:18.5204,lo:73.8567},Ahmedabad:{la:23.0225,lo:72.5714},
  Jaipur:{la:26.9124,lo:75.7873},Surat:{la:21.1702,lo:72.8311},
  Lucknow:{la:26.8467,lo:80.9462},Kanpur:{la:26.4499,lo:80.3319},
  Nagpur:{la:21.1458,lo:79.0882},Bhopal:{la:23.2599,lo:77.4126},
  Patna:{la:25.6093,lo:85.1376},Vadodara:{la:22.3072,lo:73.1812},
  Coimbatore:{la:11.0168,lo:76.9558},Visakhapatnam:{la:17.6868,lo:83.2185},
  Indore:{la:22.7196,lo:75.8577},Chandigarh:{la:30.7333,lo:76.7794},
};

/* ══════════════ MAP URL BUILDERS ══════════════ */
function buildGmapURL(la,lo,zoom,type) {
  const typeMap = { default: '0', satellite: '1', hybrid: '3' };
  const mapType = typeMap[type] || '0';
  const ts = Date.now();
  return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d10000!2d${lo}!3d${la}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f${zoom}!5e${mapType}!3m2!1sen!2sin!4v${ts}!5m2!1sen!2sin`;
}

function buildGmapURLForPlace(la,lo) {
  const typeMap = { default: '0', satellite: '1', hybrid: '3' };
  const mapType = typeMap[baseMapType] || '0';
  const ts = Date.now();
  return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${lo}!3d${la}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f15!5e${mapType}!3m2!1sen!2sin!4v${ts}!5m2!1sen!2sin`;
}

/* ══════════════ LOAD MAP ══════════════ */
function loadGmap(city) {
  const c = CITY_COORDS[city] || CITY_COORDS.Hyderabad;
  const sub = document.getElementById('loadingCitySub');
  if(sub) sub.textContent = 'Opening ' + city + ' map\u2026';
  const ld = document.getElementById('gmapLoading');
  if(ld) ld.classList.remove('hidden');
  const el = document.getElementById('gmap-iframe');
  if(!el) return;

  el.src = buildGmapURL(c.la, c.lo, 13, baseMapType);
  buildExplorer(city);
  updateAIPanel();
  // Re-apply analysis overlay if in analysis mode
  if(mapMode === 'analysis') {
    renderMapOverlay();
  }
}

function onGmapLoad() {
  const ld = document.getElementById('gmapLoading');
  if(ld) ld.classList.add('hidden');
}

const gmapIframe = document.getElementById('gmap-iframe');
if (gmapIframe) {
  gmapIframe.addEventListener('load', onGmapLoad);
}

/* ══════════════ MAP MODE — PERSISTENT ══════════════ */
function setMapMode(mode) {
  mapMode = mode;

  // Update left panel buttons
  document.querySelectorAll('#map-left-panel .mlp-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('mode-' + mode);
  if(btn) btn.classList.add('active');

  // Show/hide analysis section (animated dropdown)
  const analysisSection = document.getElementById('mlp-analysis');
  if(analysisSection) {
    if(mode === 'analysis') {
      // Toggle: if already visible, hide it
      if(analysisSection.classList.contains('show')) {
        analysisSection.classList.remove('show');
        // Also deactivate — go back to standard
        mapMode = 'standard';
        document.querySelectorAll('#map-left-panel .mlp-btn').forEach(b => b.classList.remove('active'));
        const stdBtn = document.getElementById('mode-standard');
        if(stdBtn) stdBtn.classList.add('active');
        removeAnalysisOverlay();
        removeMapOverlay();
        updateLegend();
        return;
      }
      analysisSection.classList.add('show');
    } else {
      analysisSection.classList.remove('show');
    }
  }

  if (mode === 'analysis') {
    // Just show the dropdown — don't apply any analysis yet
    // Analysis only applies when user clicks a specific option
    removeAnalysisOverlay();
    removeMapOverlay();
    updateLegend();
  } else {
    removeAnalysisOverlay();
    removeMapOverlay();
    updateLegend();
  }

  // Reload map with current base map type
  const c = CITY_COORDS[S.city] || CITY_COORDS.Hyderabad;
  const ld = document.getElementById('gmapLoading');
  if(ld) ld.classList.remove('hidden');
  const el = document.getElementById('gmap-iframe');
  if(el) {
    el.src = buildGmapURL(c.la, c.lo, 13, baseMapType);
  }
}

/* ══════════════ ANALYSIS OVERLAY — PERSISTENT ══════════════ */
function setAnalysisOverlay(overlay) {
  selectedOverlay = overlay;

  // Ensure we are in analysis mode
  if(mapMode !== 'analysis') {
    mapMode = 'analysis';
    document.querySelectorAll('#map-left-panel .mlp-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('mode-analysis');
    if(btn) btn.classList.add('active');
    const analysisSection = document.getElementById('mlp-analysis');
    if(analysisSection) analysisSection.classList.add('show');
  }

  // Update left panel analysis buttons
  document.querySelectorAll('#map-left-panel .mlp-a').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('ov-' + overlay);
  if(btn) btn.classList.add('active');

  // Update right panel metric highlighting
  document.querySelectorAll('.aip-metric').forEach(el => el.classList.remove('active'));
  const metricEl = document.getElementById('aip-metric-' + overlay);
  if(metricEl) metricEl.classList.add('active');

  // Apply the analysis overlay
  renderAnalysisOverlay();
  updateLegend();
  renderMapOverlay();
  updateAIPanel();
}

/* ══════════════ MAP OVERLAY VISUALIZATION ══════════════ */
function renderMapOverlay() {
  removeMapOverlay();

  const city = S.city || 'Hyderabad';
  const year = S.year || new Date().getFullYear();
  const model = S.model || 'LSTM';
  const c = CITY_COORDS[city] || CITY_COORDS.Hyderabad;

  const t = fb(city, year, 'traffic', model);
  const a = fb(city, year, 'aqi', model);
  const p = fb(city, year, 'population', model);
  const tP = Math.min(100, t / 1.5);
  const aP = Math.min(100, a / 3.5);
  const pP = Math.min(100, p * 3);
  const overallRisk = (tP * 0.35 + aP * 0.35 + pP * 0.3);

  let color, label, value, sub, riskLevel;
  switch(selectedOverlay) {
    case 'traffic':
      color = t > 100 ? '#dc2626' : t > 70 ? '#f97316' : t > 45 ? '#eab308' : '#22c55e';
      label = 'Traffic Risk';
      value = t.toFixed(0);
      sub = t > 100 ? 'CRITICAL' : t > 70 ? 'HIGH' : t > 45 ? 'MODERATE' : 'LOW';
      break;
    case 'aqi':
      color = a > 200 ? '#dc2626' : a > 150 ? '#9333ea' : a > 100 ? '#f97316' : a > 50 ? '#eab308' : '#22c55e';
      label = 'Air Quality';
      value = a.toFixed(0);
      sub = a > 200 ? 'HAZARDOUS' : a > 150 ? 'VERY UNHEALTHY' : a > 100 ? 'UNHEALTHY' : a > 50 ? 'MODERATE' : 'GOOD';
      break;
    case 'population':
      color = p > 20 ? '#dc2626' : p > 12 ? '#f97316' : p > 8 ? '#eab308' : '#22c55e';
      label = 'Population';
      value = p.toFixed(1) + 'M';
      sub = p > 20 ? 'CRITICAL' : p > 12 ? 'HIGH' : p > 8 ? 'MODERATE' : 'LOW';
      break;
    case 'risk':
      color = overallRisk > 70 ? '#dc2626' : overallRisk > 50 ? '#f97316' : overallRisk > 30 ? '#eab308' : '#22c55e';
      label = 'Urban Risk';
      value = overallRisk.toFixed(0) + '%';
      sub = overallRisk > 70 ? 'CRITICAL' : overallRisk > 50 ? 'HIGH' : overallRisk > 30 ? 'MODERATE' : 'LOW';
      break;
  }

  // Create the overlay visualization element
  const overlay = document.createElement('div');
  overlay.className = 'map-overlay-viz';
  overlay.id = 'mapOverlayViz';
  overlay.innerHTML = `
    <div class="map-overlay-circle" style="
      width: 160px; height: 160px;
      background: ${color}15;
      border-color: ${color}60;
      box-shadow: 0 0 60px ${color}30, 0 8px 32px rgba(0,0,0,.2);
    ">
      <div class="map-overlay-label" style="color: ${color}">${label}</div>
      <div class="map-overlay-value" style="color: ${color}">${value}</div>
      <div class="map-overlay-sub" style="color: ${color}">${sub}</div>
    </div>
  `;

  const mapWrap = document.getElementById('map-wrap');
  if(mapWrap) mapWrap.appendChild(overlay);
}

function removeMapOverlay() {
  const existing = document.getElementById('mapOverlayViz');
  if(existing) existing.remove();
}

/* ══════════════ RIGHT PANEL — CLICKABLE METRICS ══════════════ */
function selectMetricFromPanel(metric) {
  // Ensure we're in analysis mode
  if(mapMode !== 'analysis') {
    mapMode = 'analysis';
    document.querySelectorAll('#map-left-panel .mlp-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('mode-analysis');
    if(btn) btn.classList.add('active');
    const analysisSection = document.getElementById('mlp-analysis');
    if(analysisSection) analysisSection.classList.add('show');
  }
  // Select the analysis overlay (this actually applies the analysis)
  setAnalysisOverlay(metric);
  // Reload map to show the visualization
  const c = CITY_COORDS[S.city] || CITY_COORDS.Hyderabad;
  const ld = document.getElementById('gmapLoading');
  if(ld) ld.classList.remove('hidden');
  const el = document.getElementById('gmap-iframe');
  if(el) {
    el.src = buildGmapURL(c.la, c.lo, 13, baseMapType);
  }
}

/* ══════════════ MAP CLICK INFO POPUP ══════════════ */
function showMapInfoPopup() {
  if(_mapInfoOpen) return;
  _mapInfoOpen = true;

  const city = S.city || 'Hyderabad';
  const year = S.year || new Date().getFullYear();
  const model = S.model || 'LSTM';
  const t = fb(city, year, 'traffic', model);
  const a = fb(city, year, 'aqi', model);
  const p = fb(city, year, 'population', model);
  const tP = Math.min(100, t / 1.5);
  const aP = Math.min(100, a / 3.5);
  const pP = Math.min(100, p * 3);
  const overallRisk = (tP * 0.35 + aP * 0.35 + pP * 0.3);
  const riskLevel = overallRisk > 70 ? 'CRITICAL' : overallRisk > 50 ? 'HIGH' : overallRisk > 30 ? 'MODERATE' : 'LOW';
  const riskColor = overallRisk > 70 ? '#dc2626' : overallRisk > 50 ? '#f97316' : overallRisk > 30 ? '#eab308' : '#22c55e';

  // Remove existing popup
  const existing = document.getElementById('mapInfoPopup');
  if(existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'map-info-popup';
  popup.id = 'mapInfoPopup';
  popup.innerHTML = `
    <div class="popup-header">
      <div class="popup-city">${city}</div>
      <button class="popup-close" onclick="closeMapInfoPopup()">&times;</button>
    </div>
    <div class="popup-metrics">
      <div class="popup-metric" onclick="selectMetricFromPanel('traffic');closeMapInfoPopup();" style="cursor:pointer;">
        <div class="popup-metric-label">Traffic</div>
        <div class="popup-metric-value" style="color:#6366f1">${t.toFixed(0)}</div>
      </div>
      <div class="popup-metric" onclick="selectMetricFromPanel('aqi');closeMapInfoPopup();" style="cursor:pointer;">
        <div class="popup-metric-label">AQI</div>
        <div class="popup-metric-value" style="color:#f97316">${a.toFixed(0)}</div>
      </div>
      <div class="popup-metric" onclick="selectMetricFromPanel('population');closeMapInfoPopup();" style="cursor:pointer;">
        <div class="popup-metric-label">Population</div>
        <div class="popup-metric-value" style="color:#7c3aed">${p.toFixed(1)}M</div>
      </div>
      <div class="popup-metric" onclick="selectMetricFromPanel('risk');closeMapInfoPopup();" style="cursor:pointer;">
        <div class="popup-metric-label">Risk</div>
        <div class="popup-metric-value" style="color:${riskColor}">${riskLevel}</div>
      </div>
    </div>
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
      <span>${year} · ${model}</span>
      <span>Click metric to analyze</span>
    </div>
  `;

  const mapWrap = document.getElementById('map-wrap');
  if(mapWrap) mapWrap.appendChild(popup);
}

function closeMapInfoPopup() {
  _mapInfoOpen = false;
  const popup = document.getElementById('mapInfoPopup');
  if(popup) popup.remove();
}

/* ══════════════ LEFT PANEL — ANALYSIS OVERLAY ══════════════ */
function renderAnalysisOverlay() {
  const overlayEl = document.getElementById('analysis-overlay');
  if(!overlayEl) return;

  const city = S.city || 'Hyderabad';
  const year = S.year || new Date().getFullYear();
  const model = S.model || 'LSTM';

  const t = fb(city, year, 'traffic', model);
  const a = fb(city, year, 'aqi', model);
  const p = fb(city, year, 'population', model);

  const trafficPct = Math.min(100, t / 1.5);
  const aqiPct = Math.min(100, a / 3);
  const popPct = Math.min(100, p * 3.3);
  const overallRisk = (trafficPct * 0.35 + aqiPct * 0.35 + popPct * 0.3);

  let color, label, value, severity, details;
  switch(selectedOverlay) {
    case 'traffic':
      color = t > 100 ? '#dc2626' : t > 70 ? '#f97316' : t > 45 ? '#eab308' : '#22c55e';
      label = 'Traffic Risk';
      value = t.toFixed(1);
      severity = t > 100 ? 'Severe' : t > 70 ? 'High' : t > 45 ? 'Moderate' : 'Low';
      details = `<div>Peak Hours: 8\u201310 AM & 5\u20138 PM</div><div>Roads under stress: ~${Math.round(t * 0.6)}%</div>`;
      break;
    case 'aqi':
      color = a > 200 ? '#dc2626' : a > 150 ? '#9333ea' : a > 100 ? '#f97316' : a > 50 ? '#eab308' : '#22c55e';
      label = 'Air Quality';
      value = a.toFixed(0);
      severity = a > 200 ? 'Hazardous' : a > 150 ? 'Very Unhealthy' : a > 100 ? 'Unhealthy' : a > 50 ? 'Moderate' : 'Good';
      details = `<div>Primary: Vehicle emissions, industry</div><div>PM2.5 contribution: ~${Math.round(a * 0.4)} AQI pts</div>`;
      break;
    case 'population':
      color = p > 20 ? '#dc2626' : p > 12 ? '#f97316' : p > 8 ? '#eab308' : '#22c55e';
      label = 'Population Pressure';
      value = p.toFixed(2) + 'M';
      severity = p > 20 ? 'Critical' : p > 12 ? 'High' : p > 8 ? 'Moderate' : 'Low';
      const baseP = fb(city, new Date().getFullYear(), 'population', model);
      const growth = baseP > 0 ? (((p - baseP) / baseP) * 100).toFixed(1) : '0';
      details = `<div>Growth rate: ${growth}%</div><div>Density pressure: ${p > 20 ? 'Very High' : p > 12 ? 'High' : 'Moderate'}</div>`;
      break;
    case 'risk':
      color = overallRisk > 70 ? '#dc2626' : overallRisk > 50 ? '#f97316' : overallRisk > 30 ? '#eab308' : '#22c55e';
      label = 'Urban Risk';
      value = overallRisk.toFixed(0) + '%';
      severity = overallRisk > 70 ? 'Critical' : overallRisk > 50 ? 'High' : overallRisk > 30 ? 'Moderate' : 'Low';
      details = `<div>Traffic: ${trafficPct.toFixed(0)}% | AQI: ${aqiPct.toFixed(0)}%</div><div>Population: ${popPct.toFixed(0)}% | Overall: ${overallRisk.toFixed(0)}%</div>`;
      break;
  }

  const pct = selectedOverlay === 'traffic' ? trafficPct : selectedOverlay === 'aqi' ? aqiPct : selectedOverlay === 'population' ? popPct : overallRisk;
  const icon = selectedOverlay === 'traffic' ? '\ud83d\udea6' : selectedOverlay === 'aqi' ? '\ud83c\udf2c\ufe0f' : selectedOverlay === 'population' ? '\ud83d\udc65' : '\u26a0\ufe0f';

  overlayEl.innerHTML = `
    <div class="analysis-card" style="border-left: 4px solid ${color};">
      <div class="analysis-header">
        <span class="analysis-icon" style="color:${color}">${icon}</span>
        <div>
          <div class="analysis-label">${label}</div>
          <div class="analysis-city">${city} \u00b7 ${year} \u00b7 ${model}</div>
        </div>
      </div>
      <div class="analysis-value" style="color:${color}">${value}</div>
      <div class="analysis-severity" style="background:${color}20;color:${color}">${severity}</div>
      <div class="analysis-bar">
        <div class="analysis-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="analysis-details">${details}</div>
    </div>
  `;
  overlayEl.style.display = 'block';
}

function removeAnalysisOverlay() {
  const overlayEl = document.getElementById('analysis-overlay');
  if(overlayEl) {
    overlayEl.innerHTML = '';
    overlayEl.style.display = 'none';
  }
}

/* ══════════════ DYNAMIC LEGEND ══════════════ */
function updateLegend() {
  const legendEl = document.getElementById('map-legend');
  if(!legendEl) return;

  if(mapMode !== 'analysis') {
    legendEl.style.display = 'none';
    return;
  }

  legendEl.style.display = 'block';

  const legends = {
    traffic: {
      title: 'TRAFFIC RISK',
      items: [
        { color: '#22c55e', label: 'Low (< 45)' },
        { color: '#eab308', label: 'Moderate (45\u201370)' },
        { color: '#f97316', label: 'High (70\u2013100)' },
        { color: '#dc2626', label: 'Severe (> 100)' },
      ]
    },
    aqi: {
      title: 'AIR QUALITY',
      items: [
        { color: '#22c55e', label: 'Good (0\u201350)' },
        { color: '#eab308', label: 'Moderate (51\u2013100)' },
        { color: '#f97316', label: 'Unhealthy (101\u2013150)' },
        { color: '#9333ea', label: 'Very Unhealthy (151\u2013200)' },
        { color: '#dc2626', label: 'Hazardous (200+)' },
      ]
    },
    population: {
      title: 'POPULATION PRESSURE',
      items: [
        { color: '#22c55e', label: 'Low (< 8M)' },
        { color: '#eab308', label: 'Moderate (8\u201312M)' },
        { color: '#f97316', label: 'High (12\u201320M)' },
        { color: '#dc2626', label: 'Critical (> 20M)' },
      ]
    },
    risk: {
      title: 'URBAN RISK',
      items: [
        { color: '#22c55e', label: 'Low (< 30%)' },
        { color: '#eab308', label: 'Moderate (30\u201350%)' },
        { color: '#f97316', label: 'High (50\u201370%)' },
        { color: '#dc2626', label: 'Critical (> 70%)' },
      ]
    }
  };

  const legend = legends[selectedOverlay];
  if(!legend) return;

  legendEl.innerHTML = `
    <div class="legend-title">${legend.title}</div>
    ${legend.items.map(item => `
      <div class="legend-item">
        <div class="legend-swatch" style="background:${item.color}"></div>
        <div class="legend-label">${item.label}</div>
      </div>
    `).join('')}
  `;
}

/* ══════════════ BASE MAP TYPE — PERSISTENT ══════════════ */
function switchMapType(type) {
  baseMapType = type;

  // Update left panel base map buttons
  document.querySelectorAll('#map-left-panel .mlp-sm').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('mt-' + type);
  if(btn) btn.classList.add('active');

  // Reload map — keep analysis overlay if active
  const c = CITY_COORDS[S.city] || CITY_COORDS.Hyderabad;
  const ld = document.getElementById('gmapLoading');
  if(ld) ld.classList.remove('hidden');
  const el = document.getElementById('gmap-iframe');
  if(el) {
    el.src = buildGmapURL(c.la, c.lo, 13, type);
  }
}

/* ══════════════ AI PREDICTION PANEL ══════════════ */
function updateAIPanel() {
  const city = S.city || 'Hyderabad';
  const year = S.year || new Date().getFullYear();
  const model = S.model || 'LSTM';

  const t = fb(city, year, 'traffic', model);
  const a = fb(city, year, 'aqi', model);
  const p = fb(city, year, 'population', model);

  const tP = Math.min(100, t / 1.5).toFixed(0);
  const aP = Math.min(100, a / 3.5).toFixed(0);
  const pP = Math.min(100, p * 3).toFixed(0);
  const overallRisk = (tP * 0.35 + aP * 0.35 + pP * 0.3).toFixed(0);

  const _s = (id, v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  const _w = (id, v) => { const e=document.getElementById(id); if(e) e.style.width=v+'%'; };

  _s('aip-year', year);
  _s('aip-city', city);
  _s('aip-model', model);
  _s('aip-t', tP + '%');
  _w('aip-tb', tP);
  _s('aip-a', aP + '%');
  _w('aip-ab', aP);
  _s('aip-p', pP + '%');
  _w('aip-pb', pP);

  // Overall risk badge
  const riskLevel = overallRisk > 70 ? 'CRITICAL' : overallRisk > 50 ? 'HIGH' : overallRisk > 30 ? 'MODERATE' : 'LOW';
  const riskColor = overallRisk > 70 ? '#dc2626' : overallRisk > 50 ? '#f97316' : overallRisk > 30 ? '#eab308' : '#22c55e';
  _s('aip-risk', riskLevel);
  const riskEl = document.getElementById('aip-risk');
  if(riskEl) { riskEl.style.color = riskColor; riskEl.style.background = riskColor + '20'; }

  // Update model button states
  ['lstm','rf','lr'].forEach(m => {
    const e = document.getElementById('aip-'+m);
    if(e) e.classList.toggle('active', m.toUpperCase() === model);
  });

  // Update selected metric highlighting
  document.querySelectorAll('.aip-metric').forEach(el => el.classList.remove('active'));
  const metricEl = document.getElementById('aip-metric-' + selectedOverlay);
  if(metricEl && mapMode === 'analysis') metricEl.classList.add('active');

  // Status bar
  [['st-city', city], ['st-year', year], ['st-model', model]].forEach(([id, v]) => _s(id, v));

  // Re-render map overlay if in analysis mode
  if(mapMode === 'analysis') {
    renderMapOverlay();
    renderAnalysisOverlay();
    updateLegend();
  }
}

/* ══════════════ EXPLORER BAR ══════════════ */
function buildExplorer(city) {
  const wrap  = document.getElementById('expScroll');
  const title = document.getElementById('expTitle');
  if(!wrap) return;
  if(title) title.textContent = (city||'City') + ' Explorer';
  const places = PLACE_DB[city] || [];
  wrap.innerHTML = '';
  if(!places.length) {
    wrap.innerHTML = `<div style="color:#8e8e93;font-size:12px;padding:0 20px;white-space:nowrap;align-self:center;">No places for ${city}</div>`;
    return;
  }
  places.forEach(p => {
    const card = document.createElement('div');
    card.className = 'exp-card';
    card.title = p.n + ' \u2014 click to navigate on map';
    // Direct navigation — click card to fly to place on map
    card.onclick = () => {
      visitPlace(p);
    };
    const safeImg = p.img.replace(/'/g,"\\\\'");
    const safeColor = p.c;
    card.innerHTML = `
      <div class="exp-card-img" id="expimg-${p.n.replace(/\\W/g,'')}"
        style="background-image:url('${safeImg}');background-size:cover;background-position:center;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        <span class="exp-card-emoji" style="display:none;font-size:40px">${p.e}</span>
      </div>
      <div class="exp-card-type">\ud83d\udcf7 ${p.t}</div>
      <div class="exp-card-lbl">${p.n}</div>`;
    const tester = new Image();
    tester.onload = () => {};
    tester.onerror = () => {
      const bg = card.querySelector('.exp-card-img');
      const emoji = card.querySelector('.exp-card-emoji');
      if(bg) { bg.style.backgroundImage = 'none'; bg.style.background = `linear-gradient(135deg,${safeColor},${safeColor}88)`; }
      if(emoji) emoji.style.display = 'block';
    };
    tester.src = p.img;
    wrap.appendChild(card);
  });
}

function visitPlace(p) {
  const ld = document.getElementById('gmapLoading');
  const el = document.getElementById('gmap-iframe');
  if(!el) return;
  if(ld) ld.classList.remove('hidden');
  const sub = document.getElementById('loadingCitySub');
  if(sub) sub.textContent = 'Opening ' + p.n + '\u2026';
  el.src = buildGmapURLForPlace(p.la, p.lo);
  // Highlight the active card
  document.querySelectorAll('.exp-card').forEach(c => c.style.outline = 'none');
  const cards = document.querySelectorAll('.exp-card');
  cards.forEach(c => {
    if(c.title && c.title.startsWith(p.n)) {
      c.style.outline = '2px solid #6366f1';
      c.style.outlineOffset = '2px';
    }
  });
}

function expL() { const e=document.getElementById('expScroll'); if(e) e.scrollBy({left:-360,behavior:'smooth'}); }
function expR() { const e=document.getElementById('expScroll'); if(e) e.scrollBy({left:360, behavior:'smooth'}); }

/* ══════════════ PLACE MODAL ══════════════ */
let _modalPlace = null;
function openPlaceModal(p) {
  _modalPlace = p;
  const modal = document.getElementById('placeModal');
  if (!modal) return;
  document.getElementById('modalImg').src = p.img;
  document.getElementById('modalImg').alt = p.n;
  const fallback = document.getElementById('modalImgFallback');
  if(fallback) fallback.style.display = 'none';
  document.getElementById('modalImg').style.display = '';
  document.getElementById('modalType').textContent = p.t;
  document.getElementById('modalName').textContent = p.n;
  document.getElementById('modalCity').textContent = S.city;
  document.getElementById('modalVisitBtn').onclick = function() {
    visitPlace(p);
    closePlaceModal();
    if (typeof setTab === 'function') setTab('map');
  };
  modal.classList.add('open');
}
function closePlaceModal() {
  const modal = document.getElementById('placeModal');
  if (modal) modal.classList.remove('open');
  _modalPlace = null;
}

/* ══════════════ INIT ══════════════ */
function initMap() {
  const ld = document.getElementById('gmapLoading');
  if(ld) ld.classList.add('hidden');
  const iframe = document.getElementById('gmap-iframe');
  if(iframe) iframe.src = '';
  updateLegend();
}

async function refreshMap() {
  loadGmap(S.city);
  updateAIPanel();
}

// Stubs for backward compatibility
function setBaseMap(){}
function toggleOverlay(){}
function toggleLayersPanel(){}
function toggleLabels(){}
function applyHudStyle(){}
function updateOverlayInfo(){}
function redrawOverlays(){}
function riskClr(s){return s>75?'#dc2626':s>55?'#d97706':s>35?'#1a56db':'#16a34a';}
function showOverlayInfo(){}
function closeOverlayInfo(){}
function toggleOiSwitch(){}
