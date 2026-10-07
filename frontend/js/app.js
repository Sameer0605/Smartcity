/**
 * app.js — Main Application Controller
 * SmartCity AI · India Urban Intelligence
 *
 * Handles everything that ties the app together:
 *   setTab(tab)        — sidebar navigation + SPA transitions
 *   runPredict()       — city+year prediction flow
 *   onCityChange()     — city dropdown change handler
 *   onSlider(y)        — year slider drag handler
 *   setModel(m)        — ML model switch
 *   setDarkMode()      — switch to dark theme
 *   setLightMode()     — switch to light theme
 *   toggleProfile()    — profile dropdown open/close
 *   finishBoot()       — called after boot animation completes
 *   doExportPDF()      — download the structured report as a real PDF (jsPDF)
 *   doExportVisual()   — download the visualized report as a real PDF (jsPDF)
 *   showNoCityToast()  — toast when navigating without city
 */

/* ══════════════ CONTROLS ══════════════ */
function initYearControls(){
  const currentYear = new Date().getFullYear();
  const select = document.getElementById('yearInput');
  if(select){
    select.innerHTML = '';
    // Add placeholder option
    const placeholder=document.createElement('option');
    placeholder.value=''; placeholder.textContent='— Select Year —';
    placeholder.disabled=true;
    select.appendChild(placeholder);
    for(let year=currentYear; year<=2100; year++){
      const option=document.createElement('option');
      option.value=year; option.textContent=year;
      select.appendChild(option);
    }
    // Do NOT pre-select any year — let user choose
  }
  S.year=currentYear;
}
initYearControls();

// Restore remembered city from localStorage (dropdown only, no auto-predict)
(function restoreRememberedCity(){
  if(localStorage.getItem('sc-remember-city')==='true'){
    const saved=localStorage.getItem('sc-last-city');
    if(saved){
      const sel=document.getElementById('citySelect');
      if(sel){sel.value=saved; S.city=saved;}
    }
  }
})();

function filterCities(q){
  const sel=document.getElementById('citySelect');
  if(!sel)return;
  const lower=q.toLowerCase();
  Array.from(sel.options).forEach(opt=>{
    if(!opt.value){opt.hidden=false;return;}
    opt.hidden=!opt.value.toLowerCase().includes(lower);
  });
  // Auto-select if exactly one visible option matches
  const visible=[...sel.options].filter(o=>o.value&&!o.hidden);
  if(visible.length===1&&lower.length>0){sel.value=visible[0].value;onCityChange();}
}
function onCityChange(){
  const v = document.getElementById('citySelect').value;
  S.city = v || '';
  if(v) localStorage.setItem('sc-last-city', v);
  // If results were shown before, hide them again when city changes
  if(!v) {
    const results = document.getElementById('dashResults');
    const empty   = document.getElementById('dashEmpty');
    if(results){ results.style.display='none'; results.style.opacity='0'; }
    if(empty)  { empty.style.display='flex'; empty.style.opacity='1'; }
    // Clear the predictor status panel
    const ppcStatus = document.getElementById('ppcStatus');
    if(ppcStatus) ppcStatus.innerHTML = '';
    // Reset predict button text
    const btn = document.getElementById('btnPredict');
    if(btn) btn.querySelector('.ppc-btn-text').textContent = 'Run Prediction';
    resetDisplayToZero();
  }
}
function resetDisplayToZero(){
  ['kv-pop','kv-veh','kv-gc','kv-ti'].forEach(id=>{
    const e=document.getElementById(id);if(e){e.textContent='—';e.dataset.raw='0';}
  });
  ['ks-pop','ks-veh','ks-ti'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='—';});
  // Reset AI panel bars
  ['aip-tb','aip-ab','aip-pb'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.width='0%';});
  ['aip-t','aip-a','aip-p'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='—';});
  // Reset HUD
  ['ghud-pop','ghud-traf','ghud-aqi'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent='—';});
}
// Map city/year selectors removed — controlled from Dashboard only
function onMapCityChange(v){ if(v){ S.city=v; loadGmap(v); buildExplorer(v); } }
function onMapYearChange(v){ if(v){ S.year=parseInt(v); loadGmap(S.city); updateAIPanel(); } }
function onSlider(y){
  S.year=y;
  const yc=document.getElementById('yearChip'); if(yc) yc.textContent=y;
  // Sync year select to nearest option
  const yi=document.getElementById('yearInput');
  if(yi){ const opts=[...yi.options].map(o=>parseInt(o.value)); const closest=opts.reduce((a,b)=>Math.abs(b-y)<Math.abs(a-y)?b:a); yi.value=closest; }
  // Only update if results are already showing (city was already predicted)
  const results = document.getElementById('dashResults');
  if(results && results.style.display !== 'none') {
    runPredict();
  }
}
async function runPredict(){
  const cityVal = document.getElementById('citySelect').value;
  if(!cityVal){
    // Shake the select
    const sel = document.getElementById('citySelect');
    sel.classList.add('ppc-shake');
    setTimeout(()=>sel.classList.remove('ppc-shake'),600);
    showNoCityToast('predict');
    return;
  }
  const btn = document.getElementById('btnPredict');
  btn.classList.add('loading');
  btn.querySelector('.ppc-btn-text').textContent = 'Predicting…';
  // Update status to loading
  setPpcStatus('loading', cityVal);
  S.city  = cityVal;
  S.year  = Math.min(2100,Math.max(new Date().getFullYear(),parseInt(document.getElementById('yearInput').value)||new Date().getFullYear()));
  const chip=document.getElementById('yearChip'); if(chip) chip.textContent=S.year;
  document.getElementById('yearInput').value   = S.year;
  // Safety timeout — if prediction takes >15s, force fallback
  const predPromise = fetchPred(S.city, S.year, S.model);
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({
    t: fb(S.city, S.year, 'traffic', S.model),
    a: fb(S.city, S.year, 'aqi', S.model),
    p: fb(S.city, S.year, 'population', S.model)
  }), 15000));
  let t, a, p;
  try {
    ({t,a,p} = await Promise.race([predPromise, timeoutPromise]));
  } catch(e) {
    // Fallback to local ML if anything goes wrong
    t = fb(S.city, S.year, 'traffic', S.model);
    a = fb(S.city, S.year, 'aqi', S.model);
    p = fb(S.city, S.year, 'population', S.model);
  }
  updateDisplay(t,a,p);
  // Update predictor status panel
  setPpcStatus('done', cityVal, t, a, p);
  // Show results section
  const empty   = document.getElementById('dashEmpty');
  const results = document.getElementById('dashResults');
  if(empty)  { empty.style.opacity='0'; empty.style.transform='scale(.96)'; setTimeout(()=>empty.style.display='none',350); }
  if(results){
    results.style.display = 'block';
    results.style.opacity = '0';
    results.style.transform = 'translateY(20px)';
    requestAnimationFrame(()=>{
      results.style.transition = 'opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)';
      results.style.opacity = '1';
      results.style.transform = 'translateY(0)';
    });
  }
  setTimeout(()=>{ try{refreshCharts();}catch(e){} }, 80);
  setTimeout(()=>{ try{refreshAI();}catch(e){} }, 200);
  refreshMap(); buildExplorer(S.city);
  btn.classList.remove('loading');
  btn.querySelector('.ppc-btn-text').textContent = 'Re-Predict';
}

function setPpcStatus(state, city, t, a, p){
  const panel = document.getElementById('ppcStatus');
  if(!panel) return;
  if(state==='loading'){
    panel.innerHTML = `<div class="ppc-status-loading">
      <div class="ppc-spinner"></div>
      <div class="ppc-status-text">Running ML models for <b>${city}</b>…</div>
      <div class="ppc-status-sub">LSTM · Random Forest · Linear Regression</div>
    </div>`;
  } else {
    const risk = t>90?'CRITICAL':t>65?'HIGH':t>45?'MEDIUM':'LOW';
    const rc   = {CRITICAL:'#dc2626',HIGH:'#f97316',MEDIUM:'#f59e0b',LOW:'#22c55e'}[risk];
    panel.innerHTML = `<div class="ppc-status-done">
      <div class="ppc-status-city" style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted;" onclick="showCityInfo('${city}')">${city} ℹ️</div>
      <div class="ppc-status-year">${S.year} · ${S.model}</div>
      <div class="ppc-mini-grid">
        <div class="ppc-mini-item"><div class="ppc-mini-val" style="color:#7c3aed">${p.toFixed(1)}M</div><div class="ppc-mini-lbl">Population</div></div>
        <div class="ppc-mini-item"><div class="ppc-mini-val" style="color:#6366f1">${t.toFixed(0)}</div><div class="ppc-mini-lbl">Traffic Idx</div></div>
        <div class="ppc-mini-item"><div class="ppc-mini-val" style="color:#f97316">${a.toFixed(0)}</div><div class="ppc-mini-lbl">AQI</div></div>
      </div>
      <div class="ppc-risk-badge" style="background:${rc}22;color:${rc};border-color:${rc}44">⚠ ${risk} RISK</div>
    </div>`;
  }
}

function setModelChip(m){
  S.model = m;
  document.querySelectorAll('.ppc-chip').forEach(b=>{
    b.classList.toggle('active', b.id==='ppc-'+m.toLowerCase());
  });
  // Keep legacy model buttons in sync
  document.querySelectorAll('.m-btn').forEach(b=>b.className='m-btn');
  const el=document.getElementById('mb-'+m);
  if(el)el.className='m-btn a-'+m.toLowerCase();
  document.getElementById('st-model').textContent=m;
  // Auto re-predict if city already selected
  if(S.city){ runPredict(); }
}

function setModel(m){ setModelChip(m); if(typeof renderAnalysisOverlay==='function'&&typeof mapMode!=='undefined'&&mapMode==='analysis') renderAnalysisOverlay(); if(typeof updateLegend==='function') updateLegend(); }

const TAB_META={
  dashboard:['Smart City Dashboard','AI-powered urban prediction system · India'],
  map:['Map View','Interactive city risk heatmap · India'],
  analytics:['Analytics','Historical + AI forecast analysis'],
  forecast:['ML Forecast','Machine learning prediction engine'],
  ai:['AI Advisor','Smart recommendations & risk assessment'],
  compare:['City Comparison','Side-by-side city analysis'],
  reports:['Reports','Export prediction reports'],
  settings:['Settings','Manage your profile and workspace preferences'],
};
function setTab(tab){
  // Gate: if no city selected, redirect to dashboard with a prompt
  const restrictedTabs = ['analytics','forecast','ai','map'];
  if(S.booted && restrictedTabs.includes(tab) && !S.city){
    showNoCityToast(tab);
    return;
  }
  // Deactivate all
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.getElementById('pane-map').classList.remove('active');
  document.querySelectorAll('.nav-item').forEach((n,i)=>{
    const tabs=['dashboard','map','analytics','forecast','ai','compare','reports','settings'];
    n.classList.toggle('active',tabs[i]===tab);
  });
  const pEl=document.getElementById('pane-'+tab);if(pEl)pEl.classList.add('active');

  const meta=TAB_META[tab]||['SmartCity AI',''];
  document.getElementById('tbTitle').textContent=meta[0];
  document.getElementById('tbSub').textContent=meta[1];

  if(tab==='map'){
    setTimeout(()=>{ try{refreshMap();}catch{} try{buildExplorer(S.city);}catch{}; },80);
  }
  if(tab==='analytics'||tab==='forecast') refreshCharts();
  if(tab==='ai') refreshAI();
  if(tab==='compare'){
    // Pre-fill City A from global state if empty
    const selA=document.getElementById('cmpCityA');
    if(selA && !selA.value && S.city) selA.value=S.city;
  }
}

// Toast notification when no city selected
function showNoCityToast(attemptedTab) {
  const existing = document.getElementById('noCityToast');
  if(existing) existing.remove();
  const tabNames = {analytics:'Analytics',forecast:'ML Forecast',ai:'AI Advisor',map:'Map View'};
  const toast = document.createElement('div');
  toast.id = 'noCityToast';
  toast.className = 'nc-toast';
  toast.innerHTML = `
    <div class="nc-toast-icon">🏙️</div>
    <div class="nc-toast-body">
      <div class="nc-toast-title">Select a City First</div>
      <div class="nc-toast-sub">${tabNames[attemptedTab]||attemptedTab} requires a city prediction. Go to Dashboard → select city → Predict.</div>
    </div>
    <button class="nc-toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(()=>{
    toast.classList.add('nc-toast-in');
    const card = document.getElementById('predictorCard');
    if(card){ card.classList.add('ppc-highlight'); setTimeout(()=>card.classList.remove('ppc-highlight'),1200); }
    // Navigate to dashboard safely
    if(attemptedTab !== 'predict') _origSetTab('dashboard');
  });
  setTimeout(()=>{
    if(toast.parentElement){ toast.classList.remove('nc-toast-in'); setTimeout(()=>{ if(toast.parentElement)toast.remove(); },400); }
  }, 4000);
}

/* ── Report export helpers ─────────────────────────────────────────
 * Both report buttons produce a real PDF, generated in the browser with
 * jsPDF (vendored at vendor/jspdf.min.js) via js/pdf-report.js.
 * If that engine is ever unavailable we fall back to the browser's
 * Print -> "Save as PDF" flow so the user still gets a PDF, never an
 * .html file.
 */
function hasPdfEngine(){
  return !!(window.jspdf && window.jspdf.jsPDF && typeof SC_PDF !== 'undefined');
}
function printReportHtml(html){
  const w = window.open('', '_blank');
  if(!w) return false;                      // popup blocked
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>{ try{ w.print(); }catch(e){ console.warn('print failed', e); } }, 400);
  return true;
}
function downloadHtmlFallback(html, filename){
  const blob = new Blob([html], {type:'text/html'});
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename + '.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
}

/* ══════════════ STRUCTURED PDF REPORT ══════════════ */
function doExportPDF(){
  if(!S.city)return showToast('Select a city first.','warning');
  if(!S.pred||(!S.pred.t&&!S.pred.a&&!S.pred.p))return showToast('Run a prediction first.','warning');
  const{t,a,p}=S.pred;
  const gi=greenIdx(S.city,S.year);
  const now=new Date();
  const dateStr=now.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const timeStr=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});

  const risk=t>100?'CRITICAL':t>70?'HIGH':t>45?'MEDIUM':'LOW';
  const riskColor={CRITICAL:'#dc2626',HIGH:'#f97316',MEDIUM:'#d97706',LOW:'#22c55e'}[risk];
  const aqiLabel=a>200?'Hazardous':a>150?'Very Unhealthy':a>100?'Unhealthy':a>50?'Moderate':'Good';

  // Model comparison
  const models=['LSTM','RF','LR'];
  const modelAcc={LSTM:'95.0%',RF:'88.3%',LR:'72.1%'};
  const modelRows=models.map(m=>{
    const mt=fb(S.city,S.year,'traffic',m).toFixed(1);
    const ma=fb(S.city,S.year,'aqi',m).toFixed(0);
    const mp=fb(S.city,S.year,'population',m).toFixed(2);
    return `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;">${m}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;">${mt}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;">${ma}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;">${mp}M</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#6366f1;">${modelAcc[m]}</td></tr>`;
  }).join('');

  // Forecast rows
  const forecastYears=[2030,2040,2050,2060,2075,2100];
  const forecastRows=forecastYears.map(y=>{
    const ft=fb(S.city,y,'traffic',S.model),fa=fb(S.city,y,'aqi',S.model),fp=fb(S.city,y,'population',S.model);
    const r=ft>100?'CRITICAL':ft>70?'HIGH':ft>45?'MEDIUM':'LOW';
    const rc={CRITICAL:'#dc2626',HIGH:'#f97316',MEDIUM:'#d97706',LOW:'#22c55e'}[r];
    return `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;">${y}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;">${ft.toFixed(1)}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;">${fa.toFixed(0)}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;">${fp.toFixed(2)}M</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;"><span style="background:${rc}15;color:${rc};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">${r}</span></td></tr>`;
  }).join('');

  // Recommendations
  const recs=fallbackRecs(t,a,p);
  const recHtml=recs.slice(0,4).map((r,i)=>`
    <div style="border-left:3px solid ${r.priority==='CRITICAL'?'#dc2626':r.priority==='HIGH'?'#f97316':r.priority==='MEDIUM'?'#d97706':'#22c55e'};padding:10px 14px;margin-bottom:10px;background:#f8fafc;border-radius:0 8px 8px 0;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">${r.icon} ${r.title} <span style="font-size:10px;color:${r.priority==='CRITICAL'?'#dc2626':r.priority==='HIGH'?'#f97316':'#22c55e'};">[${r.priority}]</span></div>
      <div style="font-size:11.5px;color:#475569;line-height:1.5;margin-bottom:4px;">${r.description}</div>
      <div style="font-size:10.5px;color:#64748b;">Impact: <b>${r.impact}</b> · Timeline: <b>${r.timeline}</b> · Cost: <b>${r.cost_estimate}</b></div>
    </div>`).join('');

  // Executive Summary
  const execSummary=`${S.city} is projected to reach a population of ${p.toFixed(2)}M by ${S.year} with a traffic index of ${t.toFixed(1)} and AQI of ${a.toFixed(0)} (${aqiLabel}). The overall urban risk is assessed as ${risk}. Green cover stands at ${gi.toFixed(0)}%. The ${S.model} model provides predictions with established accuracy for this city's urban patterns.`;

  /* ── Preferred path: a real, selectable-text PDF ─────────────── */
  const fileName=`SmartCityAI_Report_${S.city}_${S.year}_${S.model}`;
  if(hasPdfEngine()){
    try{
      SC_PDF.buildStructured(window.jspdf.jsPDF, {
        city:S.city, year:S.year, model:S.model,
        dateStr, timeStr, yearNow: now.getFullYear(),
        t, a, p, gi, risk, aqiLabel, execSummary,
        forecast: forecastYears.map(y=>{
          const ft=fb(S.city,y,'traffic',S.model), fa=fb(S.city,y,'aqi',S.model), fp=fb(S.city,y,'population',S.model);
          const r=ft>100?'CRITICAL':ft>70?'HIGH':ft>45?'MEDIUM':'LOW';
          return {year:y, traffic:ft, aqi:fa, population:fp, risk:r};
        }),
        models: models.map(m=>({
          name:m,
          traffic:+fb(S.city,S.year,'traffic',m).toFixed(1),
          aqi:+fb(S.city,S.year,'aqi',m).toFixed(0),
          population:+fb(S.city,S.year,'population',m).toFixed(2),
          accuracy:modelAcc[m]
        })),
        insights:[
          `Traffic congestion is projected to ${t>80?'increase significantly':'remain manageable'} by ${S.year}`,
          `Air quality is expected to be ${aqiLabel.toLowerCase()} with AQI at ${a.toFixed(0)}`,
          `Population growth will ${p>20?'exert significant urban pressure':'be within sustainable limits'}`,
          `Green cover at ${gi.toFixed(0)}% ${gi<25?'requires immediate attention':'provides adequate coverage'}`
        ],
        recs: recs.slice(0,4).map(r=>({
          title:r.title, priority:r.priority, description:r.description,
          impact:r.impact, timeline:r.timeline, cost:r.cost_estimate
        }))
      }).save(fileName+'.pdf');
      showToast('Structured PDF downloaded!','success');
      return;
    }catch(err){
      console.error('PDF generation failed:', err);
      showToast('PDF generation failed - falling back to the print dialog.','warning');
    }
  }

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SmartCityAI Report — ${S.city} ${S.year}</title>
<style>
@page{margin:20mm 18mm;size:A4}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#fff;color:#0f172a;line-height:1.5}
.page{max-width:820px;margin:0 auto;padding:36px 32px}
.header{text-align:center;padding-bottom:24px;border-bottom:3px solid #6366f1;margin-bottom:32px}
.header .brand{font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#6366f1;margin-bottom:6px}
.header h1{font-size:24px;font-weight:800;color:#0f172a;margin-bottom:4px}
.header .sub{font-size:13px;color:#64748b}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:28px;font-size:12.5px}
.meta div{display:flex;gap:8px}
.meta .lbl{font-weight:700;color:#334155;min-width:110px}
.meta .val{color:#0f172a}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px}
.kpi{text-align:center;padding:14px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;border-top:3px solid}
.kpi .num{font-size:22px;font-weight:800}
.kpi .lbl{font-size:10.5px;color:#64748b;margin-top:2px}
.section{margin-bottom:24px}
.section h2{font-size:15px;font-weight:800;color:#0f172a;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
.section p{font-size:12.5px;color:#334155;line-height:1.6;margin-bottom:8px}
table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px}
th{background:#f1f5f9;padding:8px 14px;text-align:left;font-size:10.5px;font-weight:700;color:#475569;letter-spacing:.3px;text-transform:uppercase}
td{font-size:12px}
.risk-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700}
.footer{text-align:center;padding-top:20px;border-top:2px solid #e2e8f0;margin-top:32px;font-size:10.5px;color:#94a3b8}
.page-num{position:fixed;bottom:10mm;right:18mm;font-size:9px;color:#94a3b8}
@media print{.page{padding:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="brand">SmartCityAI</div>
    <h1>India Urban Intelligence Analysis Report</h1>
    <div class="sub">Generated on ${dateStr} at ${timeStr}</div>
  </div>

  <div class="meta">
    <div><span class="lbl">City:</span><span class="val" style="font-weight:700;">${S.city}</span></div>
    <div><span class="lbl">Year:</span><span class="val" style="font-weight:700;">${S.year}</span></div>
    <div><span class="lbl">Prediction Model:</span><span class="val" style="font-weight:700;color:#6366f1;">${S.model}</span></div>
    <div><span class="lbl">Report Date:</span><span class="val">${dateStr} ${timeStr}</span></div>
  </div>

  <div class="section">
    <h2>1. Executive Summary</h2>
    <p>${execSummary}</p>
  </div>

  <div class="section">
    <h2>2. City Information & Key Metrics</h2>
    <div class="kpis">
      <div class="kpi" style="border-top-color:#7c3aed"><div class="num" style="color:#7c3aed">${p.toFixed(2)}M</div><div class="lbl">Population</div></div>
      <div class="kpi" style="border-top-color:#6366f1"><div class="num" style="color:#6366f1">${t.toFixed(1)}</div><div class="lbl">Traffic Index</div></div>
      <div class="kpi" style="border-top-color:#f97316"><div class="num" style="color:#f97316">${a.toFixed(0)}</div><div class="lbl">AQI · ${aqiLabel}</div></div>
      <div class="kpi" style="border-top-color:#22c55e"><div class="num" style="color:#22c55e">${gi.toFixed(0)}%</div><div class="lbl">Green Cover</div></div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:14px;">
      <div style="width:40px;height:40px;border-radius:50%;background:${riskColor}18;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:${riskColor}">!</div>
      <div><div style="font-size:13px;font-weight:700;">Risk Assessment: <span style="color:${riskColor}">${risk}</span></div><div style="font-size:11px;color:#64748b;margin-top:2px;">Traffic: ${t>80?'Severe':t>55?'Moderate':'Manageable'} · AQI: ${aqiLabel} · Population Pressure: ${p>20?'High':p>12?'Moderate':'Low'}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>3. Prediction Analysis — 75-Year Forecast</h2>
    <table><thead><tr><th>Year</th><th>Traffic</th><th>AQI</th><th>Population</th><th>Risk Level</th></tr></thead><tbody>${forecastRows}</tbody></table>
  </div>

  <div class="section">
    <h2>4. Machine Learning Analysis</h2>
    <p>SmartCityAI employs three machine learning models for urban prediction. Below is the model comparison for ${S.city} in ${S.year}:</p>
    <table><thead><tr><th>Model</th><th>Traffic</th><th>AQI</th><th>Population</th><th>Accuracy</th></tr></thead><tbody>${modelRows}</tbody></table>
    <p style="font-size:11px;color:#64748b;">The ${S.model} model is currently active. LSTM provides the highest accuracy for time-series urban data.</p>
  </div>

  <div class="section">
    <h2>5. AI Insights</h2>
    <p>Based on the prediction analysis, the following key findings have been identified for ${S.city}:</p>
    <ul style="font-size:12px;color:#334155;padding-left:18px;line-height:1.7;">
      <li>Traffic congestion is projected to ${t>80?'increase significantly':'remain manageable'} by ${S.year}</li>
      <li>Air quality is expected to be ${aqiLabel.toLowerCase()} with AQI at ${a.toFixed(0)}</li>
      <li>Population growth will ${p>20?'exert significant urban pressure':'be within sustainable limits'}</li>
      <li>Green cover at ${gi.toFixed(0)}% ${gi<25?'requires immediate attention':'provides adequate coverage'}</li>
    </ul>
  </div>

  <div class="section">
    <h2>6. Recommendations</h2>
    ${recHtml}
  </div>

  <div class="footer">
    <div style="font-weight:700;letter-spacing:2px;color:#6366f1;margin-bottom:4px;">SMARTCITYAI</div>
    India Urban Prediction Platform · ${now.getFullYear()} · Powered by LSTM, Random Forest & Linear Regression
  </div>
</div>
</body></html>`;

  if(printReportHtml(html)){
    showToast('Opening the print dialog - choose "Save as PDF".','info');
    return;
  }
  downloadHtmlFallback(html, fileName);
  showToast('Pop-up blocked - allow pop-ups for this site to download a PDF.','warning');
}

// ── 2-Button Theme System ──
function setDarkMode(){
  document.documentElement.setAttribute('data-theme','dark');
  localStorage.setItem('sc-theme','dark');
  _syncThemeBtns('dark');
}
function setLightMode(){
  document.documentElement.setAttribute('data-theme','light');
  localStorage.setItem('sc-theme','light');
  _syncThemeBtns('light');
}
function _syncThemeBtns(theme){
  const bl=document.getElementById('btnLight');
  const bd=document.getElementById('btnDark');
  if(bl) bl.classList.toggle('active', theme==='light');
  if(bd) bd.classList.toggle('active', theme==='dark');
}
// Keep legacy toggleTheme for backward compat
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||'light';
  cur==='dark' ? setLightMode() : setDarkMode();
}
// Restore saved theme immediately
(function(){
  const saved=localStorage.getItem('sc-theme')||'light';
  document.documentElement.setAttribute('data-theme',saved);
  requestAnimationFrame(()=>_syncThemeBtns(saved));
})();


/* BOOT — bulletproof, never hangs */
const BOOT=['Loading city database...','Initialising ML models...','Ready ✓'];
let bi=0;
function finishBoot(){
  S.booted = true;
  // Hide boot screen first
  const boot = document.getElementById('boot');
  if(boot){
    boot.style.opacity = '0';
    boot.style.pointerEvents = 'none';
    setTimeout(()=>{ boot.style.display='none'; }, 500);
  }
  // Init map (safe - just clears iframe src)
  try{ initMap(); }catch(e){ console.warn('initMap',e); }
  // Init charts with a small delay to ensure DOM is visible
  setTimeout(()=>{
    try{ initCharts(); }catch(e){ console.warn('initCharts',e); }
  }, 100);
  // Reset all values to empty state
  resetDisplayToZero();
  // Init city comparison module
  try{ compareInit(); }catch(e){ console.warn('compareInit',e); }
  // Check backend silently in background
  setTimeout(()=>{ apiFetch('/health').catch(()=>{}); }, 1500);
}
const bootTick=setInterval(()=>{
  const el=document.getElementById('bootLog');
  if(el) el.textContent=BOOT[bi]||'Ready ✓';
  bi++;
  if(bi>BOOT.length){ clearInterval(bootTick); finishBoot(); }
},380);

// ── Premium sidebar ripple effect ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = item.getBoundingClientRect();
    ripple.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,.25);
      width:80px;height:80px;left:${e.clientX-rect.left-40}px;top:${e.clientY-rect.top-40}px;
      transform:scale(0);animation:rippleAnim .5s ease-out forwards;pointer-events:none;z-index:1;`;
    item.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});
const rippleStyle = document.createElement('style');
rippleStyle.textContent = '@keyframes rippleAnim{to{transform:scale(3);opacity:0;}}';
document.head.appendChild(rippleStyle);

// ── KPI card glow on hover ──
document.querySelectorAll('.kpi-card').forEach((card, i) => {
  const glows = ['rgba(124,58,237,.25)','rgba(99,102,241,.25)','rgba(34,197,94,.2)','rgba(249,115,22,.2)'];
  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = `0 16px 48px ${glows[i] || glows[0]}, inset 0 1px 0 rgba(255,255,255,.5)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = '';
  });
});

// ── SPA Tab transition — smooth fade+slide, zero flicker ──
let _lastTabIdx = 0;
const _tabOrder = ['dashboard','map','analytics','forecast','ai','compare'];
const _origSetTab = setTab;
window.setTab = function(tab){
  const scroll = document.getElementById('scroll');
  const newIdx = _tabOrder.indexOf(tab);
  const dir    = newIdx > _lastTabIdx ? 1 : -1;
  const outEl  = document.querySelector('.pane.active, #pane-map.active');
  // Fade-out current pane
  if(outEl && outEl.id !== 'pane-map'){
    outEl.style.transition = 'opacity .18s ease, transform .18s ease';
    outEl.style.opacity    = '0';
    outEl.style.transform  = `translateY(${dir > 0 ? '-10px' : '10px'})`;
  }
  setTimeout(()=>{
    _lastTabIdx = newIdx;
    _origSetTab(tab);
    // Fade-in new pane
    requestAnimationFrame(()=>{
      const inEl = document.getElementById('pane-'+tab);
      if(inEl && tab !== 'map'){
        inEl.style.opacity   = '0';
        inEl.style.transform = `translateY(${dir > 0 ? '14px' : '-14px'})`;
        inEl.style.transition= 'none';
        requestAnimationFrame(()=>{
          inEl.style.transition = 'opacity .3s cubic-bezier(.16,1,.3,1), transform .3s cubic-bezier(.16,1,.3,1)';
          inEl.style.opacity    = '1';
          inEl.style.transform  = 'translateY(0)';
        });
      }
      if(scroll) scroll.scrollTop = 0;
    });
  }, outEl && outEl.id !== 'pane-map' ? 140 : 0);
};

// ── Smooth number counter for KPI values ──
function premiumCounter(el, target, formatter, dur) {
  if(!el) return;
  const start = parseFloat(el.getAttribute('data-raw') || '0') || 0;
  el.setAttribute('data-raw', target);
  const startTime = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - startTime) / dur);
    const ease = 1 - Math.pow(1 - p, 4);
    el.textContent = formatter(start + (target - start) * ease);
    if(p < 1) requestAnimationFrame(tick);
    else el.textContent = formatter(target);
  };
  requestAnimationFrame(tick);
}

// theme auto-applied above

// ── Profile dropdown ──
function toggleProfile(){
  const dd=document.getElementById('profileDropdown');
  const btn=document.getElementById('profileBtn');
  if(!dd)return;
  const open=dd.classList.toggle('open');
  if(btn){
    btn.classList.toggle('active',open);
  }
}

function settingsMessage(message, success){
  const status=document.getElementById('settingsStatus');
  if(!status)return;
  status.textContent=message;
  status.classList.toggle('success',Boolean(success));
  setTimeout(()=>{status.textContent='Account protected';status.classList.remove('success');},3500);
}
function populateSettings(user){
  const name=document.getElementById('profileName');
  const email=document.getElementById('profileEmail');
  if(name)name.value=user.name||'';
  if(email)email.value=user.email||'';
}
function initSettings(){
  if(window.CURRENT_USER) populateSettings(window.CURRENT_USER);
  const dark=document.getElementById('settingsDarkMode');
  const remember=document.getElementById('rememberCity');
  if(dark){dark.checked=document.documentElement.getAttribute('data-theme')==='dark';dark.addEventListener('change',()=>dark.checked?setDarkMode():setLightMode());}
  if(remember){remember.checked=localStorage.getItem('sc-remember-city')==='true';remember.addEventListener('change',()=>localStorage.setItem('sc-remember-city',remember.checked));}
  document.getElementById('profileForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    try{
      const response=await fetch(API+'/api/auth/profile',{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({name:document.getElementById('profileName').value.trim(),email:document.getElementById('profileEmail').value.trim()}),signal:AbortSignal.timeout(8000)});
      const data=await response.json();
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to update profile.');
      window.CURRENT_USER=data.user;applyUserToUI(data.user);populateSettings(data.user);settingsMessage('Profile saved successfully.',true);
    }catch(error){
      const msg=error.name==='TimeoutError'?'Request timed out. Please try again.':
        error.message?.includes('fetch')?'Cannot reach server. Is the backend running?':error.message||'Unable to update profile.';
      settingsMessage(msg,false);
    }
  });
  document.getElementById('passwordForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    try{
      const response=await fetch(API+'/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({currentPassword:document.getElementById('currentPassword').value,newPassword:document.getElementById('newPassword').value,confirmPassword:document.getElementById('confirmNewPassword').value}),signal:AbortSignal.timeout(8000)});
      const data=await response.json();
      if(!response.ok||!data.success)throw new Error(data.error||'Unable to change password.');
      event.target.reset();settingsMessage('Password changed successfully.',true);
    }catch(error){
      const msg=error.name==='TimeoutError'?'Request timed out. Please try again.':
        error.message?.includes('fetch')?'Cannot reach server. Is the backend running?':error.message||'Unable to change password.';
      settingsMessage(msg,false);
    }
  });
}
/* ══════════════ SETTINGS PERSISTENCE ══════════════ */
function saveSetting(key, value) {
  try { localStorage.setItem('sc-pref-' + key, JSON.stringify(value)); } catch(e) {}
}
function loadSetting(key, defaultVal) {
  try {
    const v = localStorage.getItem('sc-pref-' + key);
    return v !== null ? JSON.parse(v) : defaultVal;
  } catch(e) { return defaultVal; }
}
function resetWorkspacePreferences(){
  localStorage.removeItem('sc-remember-city');
  // Clear all SmartCityAI preferences
  const prefKeys = ['defaultCity','predictionModel','defaultView','forecastYear','mapTraffic','mapAQI','mapMarkers','mapAutoRefresh','aiRecs','riskAlerts','confidenceScores','recDetail','alertTraffic','alertAQI','alertPop','alertPred','reportFormat','reportCharts','reportAI','reportPred','reportModel','reducedMotion','compactDashboard','showTooltips'];
  prefKeys.forEach(k => localStorage.removeItem('sc-pref-' + k));
  const remember=document.getElementById('rememberCity');if(remember)remember.checked=false;
  setLightMode();
  const dark=document.getElementById('settingsDarkMode');if(dark)dark.checked=false;
  // Reset all toggle/checkboxes to defaults
  document.querySelectorAll('.settings-preferences input[type=checkbox]').forEach(cb => {
    if(cb.id !== 'settingsDarkMode' && cb.id !== 'rememberCity') {
      const key = cb.id.replace('pref', '').replace(/([A-Z])/g, (m, c) => c.toLowerCase());
      const defaults = { mapTraffic:true, mapAQI:true, mapMarkers:true, mapAutoRefresh:true, aiRecs:true, riskAlerts:true, confidenceScores:true, alertTraffic:true, alertAQI:true, alertPop:true, alertPred:true, reportCharts:true, reportAI:true, reportPred:true, reportModel:true, reducedMotion:false, compactDashboard:false, showTooltips:true };
      cb.checked = defaults[cb.id.replace('pref','')] !== undefined ? defaults[cb.id.replace('pref','')] : true;
    }
  });
  settingsMessage('Preferences reset.',true);
}

function loadSettings() {
  // Populate city dropdown
  const citySel = document.getElementById('prefDefaultCity');
  if (citySel && typeof CITIES !== 'undefined') {
    const cities = Object.keys(CITIES).sort();
    cities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      if (c === S.city) opt.selected = true;
      citySel.appendChild(opt);
    });
    const savedCity = loadSetting('defaultCity', S.city || 'Hyderabad');
    citySel.value = savedCity;
  }
  // Populate forecast year dropdown
  const yearSel = document.getElementById('prefForecastYear');
  if (yearSel) {
    for (let y = new Date().getFullYear(); y <= 2100; y += 5) {
      const opt = document.createElement('option'); opt.value = y; opt.textContent = y;
      yearSel.appendChild(opt);
    }
    yearSel.value = loadSetting('forecastYear', S.year || new Date().getFullYear());
  }
  // Load saved preferences into UI
  const boolPrefs = {
    prefMapTraffic:'mapTraffic', prefMapAQI:'mapAQI', prefMapMarkers:'mapMarkers', prefMapAutoRefresh:'mapAutoRefresh',
    prefAIRecs:'aiRecs', prefRiskAlerts:'riskAlerts', prefConfidence:'confidenceScores',
    prefAlertTraffic:'alertTraffic', prefAlertAQI:'alertAQI', prefAlertPop:'alertPop', prefAlertPred:'alertPred',
    prefReportCharts:'reportCharts', prefReportAI:'reportAI', prefReportPred:'reportPred', prefReportModel:'reportModel',
    prefReducedMotion:'reducedMotion', prefCompact:'compactDashboard', prefTooltips:'showTooltips',
    rememberCity:'rememberCity'
  };
  Object.entries(boolPrefs).forEach(([elId, prefKey]) => {
    const el = document.getElementById(elId);
    if (el) el.checked = loadSetting(prefKey, el.checked);
  });
  const stringPrefs = { prefModel:'predictionModel', prefDefaultView:'defaultView', prefRecDetail:'recDetail', prefReportFormat:'reportFormat' };
  Object.entries(stringPrefs).forEach(([elId, prefKey]) => {
    const el = document.getElementById(elId);
    if (el) el.value = loadSetting(prefKey, el.value);
  });
}
loadSettings();
initSettings();

/* ══════════════ ANALYTICS PANEL ══════════════ */
(function loadAnalytics(){
  const kpiEl = document.getElementById('analyticsKpis');
  const topEl = document.getElementById('analyticsTop');
  if(!kpiEl) return;
  fetch(API+'/api/analytics/summary',{credentials:'include',signal:AbortSignal.timeout(5000)})
    .then(r=>r.json())
    .then(d=>{
      if(!d.success||!d.analytics) return;
      const a=d.analytics;
      kpiEl.innerHTML=[
        {lbl:'Total Views',val:a.total_views,c:'#6366f1'},
        {lbl:'Today',val:a.today_views,c:'#22c55e'},
        {lbl:'This Week',val:a.week_views,c:'#f97316'},
        {lbl:'Unique Visitors',val:a.unique_visitors,c:'#7c3aed'},
      ].map(k=>`<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:22px;font-weight:800;color:${k.c};font-family:var(--mono);">${k.val}</div><div style="font-size:11px;color:var(--text-3);margin-top:4px;">${k.lbl}</div></div>`).join('');
      if(a.top_pages&&a.top_pages.length){
        topEl.innerHTML='<b style="font-size:12px;color:var(--text-2)">Top Pages:</b> '+a.top_pages.slice(0,5).map(p=>`${p.page} (${p.views})`).join(' \u00B7 ');
      }
    })
    .catch(()=>{
      // Analytics unavailable — show placeholder
      kpiEl.innerHTML='<div style="font-size:12px;color:var(--text-3);grid-column:1/-1;text-align:center;padding:12px;">Analytics unavailable — backend may be offline</div>';
    });
})();
document.addEventListener('click',function(e){
  const wrap=document.getElementById('profileWrap');
  if(wrap&&!wrap.contains(e.target)){
    const dd=document.getElementById('profileDropdown');
    const btn=document.getElementById('profileBtn');
    if(dd) dd.classList.remove('open');
    if(btn) btn.classList.remove('active');
  }
});

/* ══════════════ KEYBOARD SHORTCUTS ══════════════ */
(function initShortcuts(){
  const SHORTCUTS=[
    {keys:'1-5',desc:'Switch tabs (Dashboard, Map, Analytics, Forecast, AI)'},
    {keys:'P',desc:'Run prediction'},
    {keys:'/',desc:'Focus city search'},
    {keys:'D',desc:'Toggle dark/light mode'},
    {keys:'F',desc:'Toggle fullscreen mode'},
    {keys:'?',desc:'Show this help'},
    {keys:'Esc',desc:'Close modal / panel'},
  ];
  const modal=document.createElement('div');
  modal.id='shortcutsModal';
  modal.style.cssText='display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);align-items:center;justify-content:center;';
  modal.innerHTML=`<div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:400px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div style="font-size:17px;font-weight:800;color:#0f172a;">Keyboard Shortcuts</div>
      <button onclick="document.getElementById('shortcutsModal').style.display='none'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">&times;</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${SHORTCUTS.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;color:#334155;">${s.desc}</span>
        <kbd style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;font-size:12px;font-family:monospace;color:#475569;white-space:nowrap;">${s.keys}</kbd>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8;">Press <kbd style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:1px 5px;font-size:11px;font-family:monospace;">Esc</kbd> or <kbd style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:1px 5px;font-size:11px;font-family:monospace;">?</kbd> to close</div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});

  const TAB_KEYS={'1':'dashboard','2':'map','3':'analytics','4':'forecast','5':'ai'};
  document.addEventListener('keydown',e=>{
    // Don't trigger shortcuts when typing in inputs
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
    const k=e.key;
    if(k==='?'){e.preventDefault();modal.style.display=modal.style.display==='flex'?'none':'flex';return;}
    if(k==='Escape'){modal.style.display='none';closePlaceModal&&closePlaceModal();return;}
    if(TAB_KEYS[k]){e.preventDefault();setTab(TAB_KEYS[k]);return;}
    if(k==='p'||k==='P'){e.preventDefault();runPredict();return;}
    if(k==='d'||k==='D'){e.preventDefault();toggleTheme();return;}
    if(k==='f'||k==='F'){e.preventDefault();toggleFullscreen();return;}
    if(k==='/'){e.preventDefault();document.getElementById('citySelect')?.focus();return;}
  });
})();

/* ══════════════ TOAST NOTIFICATIONS ══════════════ */
function showToast(message, type, duration){
  type=type||'info'; duration=duration||4000;
  const colors={info:'#1a56db',success:'#16a34a',warning:'#d97706',error:'#dc2626'};
  const icons={info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'};
  const toast=document.createElement('div');
  toast.className='sc-toast';
  toast.style.cssText=`position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:12px 18px;box-shadow:0 8px 32px rgba(0,0,0,.15);border-left:4px solid ${colors[type]};font-size:13px;color:#1e293b;transform:translateX(120%);transition:transform .35s cubic-bezier(.16,1,.3,1);max-width:380px;`;
  toast.innerHTML=`<span style="font-size:16px;flex:none;">${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(()=>requestAnimationFrame(()=>toast.style.transform='translateX(0)'));
  setTimeout(()=>{
    toast.style.transform='translateX(120%)';
    setTimeout(()=>toast.remove(),400);
  },duration);
}

/* ══════════════ OFFLINE DETECTION ══════════════ */
(function initOfflineDetection(){
  let wasOnline=navigator.onLine;
  window.addEventListener('offline',()=>{
    wasOnline=false;
    showToast('Backend unreachable. Using offline ML engine.','warning',6000);
  });
  window.addEventListener('online',()=>{
    if(!wasOnline){
      showToast('Backend connection restored!','success',3000);
      wasOnline=true;
    }
  });
  // Periodic backend check — use short retries, suppress toast
  setInterval(async()=>{
    try{await apiFetch('/health',{retries:1,timeoutMs:4000,silent:true});}
    catch{}
  },30000);
})();

/* ══════════════ VISUALIZED DATA REPORT ══════════════ */
function doExportVisual(){
  if(!S.city)return showToast('Select a city first.','warning');
  if(!S.pred||(!S.pred.t&&!S.pred.a&&!S.pred.p))return showToast('Run a prediction first.','warning');
  const{t,a,p}=S.pred;
  const gi=greenIdx(S.city,S.year);
  const now=new Date();
  const dateStr=now.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});

  const risk=t>100?'CRITICAL':t>70?'HIGH':t>45?'MEDIUM':'LOW';
  const riskColor={CRITICAL:'#dc2626',HIGH:'#f97316',MEDIUM:'#d97706',LOW:'#22c55e'}[risk];
  const aqiLabel=a>200?'Hazardous':a>150?'Very Unhealthy':a>100?'Unhealthy':a>50?'Moderate':'Good';

  // Generate chart data
  const cur= new Date().getFullYear();
  const years=[];const popData=[];const trafData=[];const aqiData=[];
  for(let y=cur;y<=2100;y+=5){
    years.push(y);
    popData.push(+(fb(S.city,y,'population',S.model)).toFixed(2));
    trafData.push(+(fb(S.city,y,'traffic',S.model)).toFixed(1));
    aqiData.push(+(fb(S.city,y,'aqi',S.model)).toFixed(0));
  }

  // Bar chart for current metrics
  const barMax=Math.max(t,a,gi*3,p*5);
  const barT=t/barMax*100;
  const barA=a/barMax*100;
  const barG=gi/barMax*100*3;
  const barP=p/barMax*100*5;

  // Risk gauge
  const riskPct=t>100?90:t>70?70:t>45?45:25;

  /* ── Preferred path: a real, selectable-text PDF ─────────────── */
  const fileName=`SmartCityAI_Visual_${S.city}_${S.year}_${S.model}`;
  if(hasPdfEngine()){
    try{
      SC_PDF.buildVisual(window.jspdf.jsPDF, {
        city:S.city, year:S.year, model:S.model,
        dateStr, yearNow: now.getFullYear(),
        t, a, p, gi, risk, aqiLabel, riskPct,
        bars:[
          {label:'Population',   value:p.toFixed(2)+'M', pct:barP, color:'#7c3aed'},
          {label:'Traffic Index',value:t.toFixed(1),     pct:barT, color:'#6366f1'},
          {label:'AQI',          value:a.toFixed(0),     pct:barA, color:'#f97316'},
          {label:'Green Cover',  value:gi.toFixed(0)+'%',pct:barG, color:'#16a34a'}
        ],
        series:{ years, pop:popData, traf:trafData, aqi:aqiData },
        models:['LSTM','RF','LR'].map(m=>({
          name:m,
          traffic:+fb(S.city,S.year,'traffic',m).toFixed(1),
          aqi:+fb(S.city,S.year,'aqi',m).toFixed(0),
          population:+fb(S.city,S.year,'population',m).toFixed(2),
          accuracy:{LSTM:'95.0%',RF:'88.3%',LR:'72.1%'}[m]
        })),
        insights:[
          {title:'Traffic Congestion', level:t>80?'danger':'warn',
           desc:`Traffic index at ${t.toFixed(1)} - ${t>80?'severe congestion requiring immediate infrastructure investment':t>55?'moderate congestion needing upgrades':'manageable traffic flow'}. Current model: ${S.model}.`},
          {title:'Air Quality', level:a>120?'warn':'good',
           desc:`AQI at ${a.toFixed(0)} (${aqiLabel}). ${a>120?'Pollution mitigation strategies recommended.':'Air quality within acceptable range.'}`},
          {title:'Population Pressure', level:p>20?'warn':'good',
           desc:`Projected population ${p.toFixed(2)}M by ${S.year}. ${p>20?'Satellite city development recommended.':'Growth within sustainable capacity.'}`},
          {title:'Green Cover', level:gi<25?'danger':'good',
           desc:`Green cover at ${gi.toFixed(0)}%. ${gi<25?'Significant reforestation needed.':'Adequate green infrastructure.'}`}
        ]
      }).save(fileName+'.pdf');
      showToast('Visual report PDF downloaded!','success');
      return;
    }catch(err){
      console.error('PDF generation failed:', err);
      showToast('PDF generation failed - falling back to the print dialog.','warning');
    }
  }

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SmartCityAI Visual Report — ${S.city}</title>
<style>
@page{margin:18mm 16mm;size:A4}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#0f172a}
.page{max-width:820px;margin:0 auto;padding:32px 28px}
.header{text-align:center;padding-bottom:20px;border-bottom:3px solid #16a34a;margin-bottom:28px}
.header .brand{font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#16a34a;margin-bottom:6px}
.header h1{font-size:22px;font-weight:800;margin-bottom:4px}
.header .sub{font-size:12px;color:#64748b}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px}
.kpi{text-align:center;padding:16px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px}
.kpi .num{font-size:24px;font-weight:800}
.kpi .lbl{font-size:10px;color:#64748b;margin-top:2px}
.section{margin-bottom:28px}
.section h2{font-size:14px;font-weight:800;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e2e8f0;display:flex;align-items:center;gap:8px}
.chart-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:12px}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.bar-label{width:120px;font-size:11px;font-weight:600;color:#334155;text-align:right}
.bar-track{flex:1;height:24px;background:#e2e8f0;border-radius:6px;overflow:hidden;position:relative}
.bar-fill{height:100%;border-radius:6px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:10px;font-weight:700;color:#fff;transition:width .5s}
.line-chart{position:relative;width:100%;height:200px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
.line-chart svg{width:100%;height:100%}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:11.5px}
.risk-badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:700}
.insight-card{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:8px}
.insight-card.warn{background:#fef3c7;border-color:#fde68a}
.insight-card.danger{background:#fef2f2;border-color:#fecaca}
.insight-card .title{font-size:12px;font-weight:700;margin-bottom:3px}
.insight-card .desc{font-size:11px;color:#475569;line-height:1.5}
.footer{text-align:center;padding-top:16px;border-top:2px solid #e2e8f0;margin-top:28px;font-size:10px;color:#94a3b8}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="brand">SmartCityAI</div>
    <h1>Urban Data Visualization Report</h1>
    <div class="sub">${S.city} · ${S.year} · ${S.model} · ${dateStr}</div>
  </div>

  <div class="kpi-row">
    <div class="kpi" style="border-top:3px solid #7c3aed"><div class="num" style="color:#7c3aed">${p.toFixed(2)}M</div><div class="lbl">Population</div></div>
    <div class="kpi" style="border-top:3px solid #6366f1"><div class="num" style="color:#6366f1">${t.toFixed(1)}</div><div class="lbl">Traffic Index</div></div>
    <div class="kpi" style="border-top:3px solid #f97316"><div class="num" style="color:#f97316">${a.toFixed(0)}</div><div class="lbl">AQI · ${aqiLabel}</div></div>
    <div class="kpi" style="border-top:3px solid #22c55e"><div class="num" style="color:#22c55e">${gi.toFixed(0)}%</div><div class="lbl">Green Cover</div></div>
  </div>

  <div class="section">
    <h2>📊 Metric Comparison</h2>
    <div class="chart-box">
      <div class="bar-row"><div class="bar-label">Population</div><div class="bar-track"><div class="bar-fill" style="width:${barP}%;background:linear-gradient(90deg,#7c3aed,#a78bfa)">${p.toFixed(2)}M</div></div></div>
      <div class="bar-row"><div class="bar-label">Traffic Index</div><div class="bar-track"><div class="bar-fill" style="width:${barT}%;background:linear-gradient(90deg,#6366f1,#818cf8)">${t.toFixed(1)}</div></div></div>
      <div class="bar-row"><div class="bar-label">AQI</div><div class="bar-track"><div class="bar-fill" style="width:${barA}%;background:linear-gradient(90deg,#f97316,#fb923c)">${a.toFixed(0)}</div></div></div>
      <div class="bar-row"><div class="bar-label">Green Cover</div><div class="bar-track"><div class="bar-fill" style="width:${barG}%;background:linear-gradient(90deg,#16a34a,#4ade80)">${gi.toFixed(0)}%</div></div></div>
    </div>
  </div>

  <div class="section">
    <h2>📈 Population Growth Trend (${cur}–2100)</h2>
    <div class="chart-box">
      <svg viewBox="0 0 700 180" style="width:100%;height:180px;">
        <line x1="50" y1="160" x2="680" y2="160" stroke="#e2e8f0" stroke-width="1"/>
        ${popData.map((v,i)=>{const x=50+i*(630/(popData.length-1));const y=160-(v/Math.max(...popData))*140;return `<circle cx="${x}" cy="${y}" r="3" fill="#7c3aed"/><text x="${x}" y="${y-8}" text-anchor="middle" font-size="8" fill="#64748b">${v.toFixed(1)}</text>`;}).join('')}
        <polyline points="${popData.map((v,i)=>{const x=50+i*(630/(popData.length-1));const y=160-(v/Math.max(...popData))*140;return `${x},${y}`;}).join(' ')}" fill="none" stroke="#7c3aed" stroke-width="2"/>
        <polyline points="${popData.map((v,i)=>{const x=50+i*(630/(popData.length-1));const y=160-(v/Math.max(...popData))*140;return `${x},${y}`;}).join(' ')} 680,160 50,160" fill="url(#popGrad)" stroke="none"/>
        <defs><linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.15"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></linearGradient></defs>
        ${years.filter((_,i)=>i%2===0).map((y,i)=>{const x=50+(i*2)*(630/(years.length-1));return `<text x="${x}" y="175" text-anchor="middle" font-size="9" fill="#94a3b8">${y}</text>`;}).join('')}
      </svg>
    </div>
  </div>

  <div class="section">
    <h2>🚦 Traffic & AQI Trend</h2>
    <div class="chart-box">
      <svg viewBox="0 0 700 180" style="width:100%;height:180px;">
        <line x1="50" y1="160" x2="680" y2="160" stroke="#e2e8f0" stroke-width="1"/>
        ${trafData.map((v,i)=>{const x=50+i*(630/(trafData.length-1));const y=160-(v/Math.max(...trafData,...aqiData))*140;return `<circle cx="${x}" cy="${y}" r="3" fill="#6366f1"/>`;}).join('')}
        <polyline points="${trafData.map((v,i)=>{const x=50+i*(630/(trafData.length-1));const y=160-(v/Math.max(...trafData,...aqiData))*140;return `${x},${y}`;}).join(' ')}" fill="none" stroke="#6366f1" stroke-width="2"/>
        ${aqiData.map((v,i)=>{const x=50+i*(630/(aqiData.length-1));const y=160-(v/Math.max(...trafData,...aqiData))*140;return `<circle cx="${x}" cy="${y}" r="3" fill="#f97316"/>`;}).join('')}
        <polyline points="${aqiData.map((v,i)=>{const x=50+i*(630/(aqiData.length-1));const y=160-(v/Math.max(...trafData,...aqiData))*140;return `${x},${y}`;}).join(' ')}" fill="none" stroke="#f97316" stroke-width="2"/>
        <rect x="55" y="5" width="12" height="12" rx="2" fill="#6366f1"/><text x="72" y="15" font-size="9" fill="#475569">Traffic</text>
        <rect x="120" y="5" width="12" height="12" rx="2" fill="#f97316"/><text x="137" y="15" font-size="9" fill="#475569">AQI</text>
        ${years.filter((_,i)=>i%2===0).map((y,i)=>{const x=50+(i*2)*(630/(years.length-1));return `<text x="${x}" y="175" text-anchor="middle" font-size="9" fill="#94a3b8">${y}</text>`;}).join('')}
      </svg>
    </div>
  </div>

  <div class="section">
    <h2>⚠️ Urban Risk Assessment</h2>
    <div class="chart-box" style="text-align:center;">
      <div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;">
        <div style="width:120px;height:120px;border-radius:50%;border:8px solid #e2e8f0;position:relative;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 120 120" style="position:absolute;top:0;left:0;width:100%;height:100%;transform:rotate(-90deg)">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="${riskColor}" stroke-width="8" stroke-dasharray="326.7" stroke-dashoffset="${326.7*(1-riskPct/100)}" stroke-linecap="round"/>
          </svg>
          <div style="font-size:24px;font-weight:800;color:${riskColor}">${riskPct}%</div>
        </div>
        <div style="font-size:14px;font-weight:700;">Overall Risk: <span style="color:${riskColor}">${risk}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🤖 Model Performance</h2>
    <div class="table-wrap">
      <table><thead><tr><th>Model</th><th>Traffic</th><th>AQI</th><th>Population</th><th>Accuracy</th></tr></thead><tbody>
        ${['LSTM','RF','LR'].map(m=>{const mt=fb(S.city,S.year,'traffic',m).toFixed(1);const ma=fb(S.city,S.year,'aqi',m).toFixed(0);const mp=fb(S.city,S.year,'population',m).toFixed(2);const acc={LSTM:'95.0%',RF:'88.3%',LR:'72.1%'}[m];return `<tr><td style="font-weight:700;">${m}</td><td>${mt}</td><td>${ma}</td><td>${mp}M</td><td style="font-weight:600;color:#6366f1;">${acc}</td></tr>`;}).join('')}
      </tbody></table>
    </div>
  </div>

  <div class="section">
    <h2>💡 Key Insights</h2>
    <div class="insight-card ${t>80?'danger':''}"><div class="title">${t>80?'🔴':'🟡'} Traffic Congestion</div><div class="desc">Traffic index at ${t.toFixed(1)} — ${t>80?'severe congestion requiring immediate infrastructure investment':t>55?'moderate congestion needing upgrades':'manageable traffic flow'}. Current model: ${S.model}.</div></div>
    <div class="insight-card ${a>120?'warn':''}"><div class="title">${a>120?'🔴':'🟢'} Air Quality</div><div class="desc">AQI at ${a.toFixed(0)} (${aqiLabel}). ${a>120?'Pollution mitigation strategies recommended.':'Air quality within acceptable range.'}</div></div>
    <div class="insight-card ${p>20?'warn':''}"><div class="title">${p>20?'🟡':'🟢'} Population Pressure</div><div class="desc">Projected population ${p.toFixed(2)}M by ${S.year}. ${p>20?'Satellite city development recommended.':'Growth within sustainable capacity.'}</div></div>
    <div class="insight-card ${gi<25?'danger':''}"><div class="title">${gi<25?'🔴':'🟢'} Green Cover</div><div class="desc">Green cover at ${gi.toFixed(0)}%. ${gi<25?'Significant reforestation needed.':'Adequate green infrastructure.'}</div></div>
  </div>

  <div class="footer">
    <div style="font-weight:700;letter-spacing:2px;color:#16a34a;margin-bottom:4px;">SMARTCITYAI</div>
    India Urban Prediction Platform · ${now.getFullYear()} · Visual Data Report
  </div>
</div>
</body></html>`;

  if(printReportHtml(html)){
    showToast('Opening the print dialog - choose "Save as PDF".','info');
    return;
  }
  downloadHtmlFallback(html, fileName);
  showToast('Pop-up blocked - allow pop-ups for this site to download a PDF.','warning');
}

/* ══════════════ CITY INFO PANEL ══════════════ */
let _cityInfoModal=null;
function showCityInfo(city){
  const facts=CITY_FACTS&&CITY_FACTS[city];
  if(!facts)return showToast('No info available for '+city,'info');
  if(!_cityInfoModal){
    _cityInfoModal=document.createElement('div');
    _cityInfoModal.id='cityInfoModal';
    _cityInfoModal.style.cssText='display:none;position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);align-items:center;justify-content:center;';
    _cityInfoModal.addEventListener('click',e=>{if(e.target===_cityInfoModal)_cityInfoModal.style.display='none';});
    document.body.appendChild(_cityInfoModal);
  }
  const g=CITIES[city];
  const pred=S.pred;
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const _f=v=>v?(v>200?'Hazardous':v>150?'Unhealthy':v>100?'Moderate':'Good'):'—';
  const bgc=isDark?'#1e293b':'#fff';
  const txtPrimary=isDark?'#f1f5f9':'#0f172a';
  const txtSecondary=isDark?'#94a3b8':'#475569';
  const txtMuted=isDark?'#64748b':'#94a3b8';
  const metaBg=isDark?'#0f172a':'#f8fafc';
  const closeBtnColor=isDark?'#94a3b8':'#64748b';
  _cityInfoModal.innerHTML=`<div style="background:${bgc};border-radius:16px;padding:28px 32px;max-width:440px;width:92%;box-shadow:0 24px 64px rgba(0,0,0,.25);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:20px;font-weight:800;color:${txtPrimary};">${city}</div>
      <button onclick="document.getElementById('cityInfoModal').style.display='none'" style="background:none;border:none;font-size:22px;cursor:pointer;color:${closeBtnColor};">&times;</button>
    </div>
    <div style="font-size:12.5px;color:${txtSecondary};line-height:1.6;margin-bottom:16px;">${facts.desc}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:16px;">
      ${[['\u{1F4CD} State',facts.state],['\u{1F4CA} Population (2024)',facts.pop2024],['\u{1F4D0} Area',facts.area],['\u{1F4C9} Density',facts.density],['\u{1F3F0} Famous For',facts.famous],['\u{1F30D} Coordinates',`${g.lat}\u00B0N, ${g.lng}\u00B0E`]].map(([l,v])=>`<div style="display:flex;flex-direction:column;gap:2px;"><div style="font-size:10.5px;font-weight:700;color:${txtMuted};text-transform:uppercase;letter-spacing:.3px;">${l}</div><div style="font-size:12.5px;font-weight:600;color:${txtPrimary};">${v}</div></div>`).join('')}
    </div>
    ${pred.t?`<div style="background:${metaBg};border-radius:10px;padding:12px 14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
      <div><div style="font-size:18px;font-weight:800;color:#6366f1;">${pred.t.toFixed(0)}</div><div style="font-size:10px;color:${closeBtnColor};">Traffic</div></div>
      <div><div style="font-size:18px;font-weight:800;color:#f97316;">${pred.a.toFixed(0)}</div><div style="font-size:10px;color:${closeBtnColor};">AQI ${_f(pred.a)}</div></div>
      <div><div style="font-size:18px;font-weight:800;color:#7c3aed;">${pred.p.toFixed(1)}M</div><div style="font-size:10px;color:${closeBtnColor};">Population</div></div>
    </div>`:''}
    <div style="text-align:center;margin-top:14px;">
      <button onclick="document.getElementById('cityInfoModal').style.display='none'" style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:12.5px;font-weight:700;cursor:pointer;">Close</button>
    </div>
  </div>`;
  _cityInfoModal.style.display='flex';
}

/* ══════════════ FULLSCREEN MODE ══════════════ */
let _isFullscreen=false;
function toggleFullscreen(){
  if(!document.fullscreenElement){document.documentElement.requestFullscreen().catch(()=>{});_isFullscreen=true;}
  else{document.exitFullscreen().catch(()=>{});_isFullscreen=false;}
  showToast(_isFullscreen?'Fullscreen mode (Esc to exit)':'Exited fullscreen','info',2000);
}

/* ══════════════ MOBILE HAMBURGER MENU ══════════════ */
(function initMobileMenu(){
  const btn=document.createElement('button');
  btn.id='mobileMenuBtn';
  btn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  btn.style.cssText='display:none;position:fixed;top:12px;left:12px;z-index:1001;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.1);color:var(--text-1,#0f172a);';
  btn.addEventListener('click',()=>{
    const sb=document.getElementById('sb');
    if(sb)sb.classList.toggle('sb-open');
  });
  document.body.appendChild(btn);
  // Show on small screens
  const mq=window.matchMedia('(max-width:768px)');
  const apply=m=>btn.style.display=m.matches?'block':'none';
  apply(mq);mq.addEventListener('change',apply);
  // Close sidebar when clicking a nav item on mobile
  document.querySelectorAll('.nav-item').forEach(n=>n.addEventListener('click',()=>{
    const sb=document.getElementById('sb');if(sb)sb.classList.remove('sb-open');
  }));
})();

/* ══════════════ SKELETON LOADING ══════════════ */
const SKELETON_CSS='background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:skShimmer 1.5s infinite;border-radius:8px;';
(function injectSkeletonKeyframes(){
  if(document.getElementById('skStyle'))return;
  const s=document.createElement('style');s.id='skStyle';
  s.textContent='@keyframes skShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
  document.head.appendChild(s);
})();
function showSkeleton(el,count){
  if(!el)return;
  el.innerHTML=Array.from({length:count||3},(_,i)=>
    `<div style="height:18px;width:${60+Math.random()*30}%;${SKELETON_CSS}margin-bottom:10px;"></div>`
  ).join('');
}

/* ══════════════ DARK MODE CHART THEME ══════════════ */
(function patchChartTheme(){
  const apply=()=>{
    const dark=document.documentElement.getAttribute('data-theme')==='dark';
    const textColor=dark?'#94a3b8':'#64748b';
    const gridColor=dark?'#1e293b':'#f1f5f9';
    const tooltipBg=dark?'rgba(15,23,42,.95)':'rgba(255,255,255,.98)';
    const tooltipBorder=dark?'#334155':'#e2e8f0';
    const tooltipTitle=dark?'#f1f5f9':'#0f172a';
    const tooltipBody=dark?'#cbd5e1':'#334155';
    Chart.defaults.color=textColor;
    Chart.defaults.plugins.tooltip.backgroundColor=tooltipBg;
    Chart.defaults.plugins.tooltip.borderColor=tooltipBorder;
    Chart.defaults.plugins.tooltip.titleColor=tooltipTitle;
    Chart.defaults.plugins.tooltip.bodyColor=tooltipBody;
    if(Chart.defaults.scales){
      if(Chart.defaults.scales.x){Chart.defaults.scales.x.grid.color=gridColor;Chart.defaults.scales.x.ticks.color=textColor;}
      if(Chart.defaults.scales.y){Chart.defaults.scales.y.grid.color=gridColor;Chart.defaults.scales.y.ticks.color=textColor;}
    }
    // Re-render active charts if they exist
    if(typeof refreshCharts==='function'&&S.city)refreshCharts();
  };
  apply();
  // Re-apply on theme toggle
  const origDark=setDarkMode;const origLight=setLightMode;
  window.setDarkMode=function(){origDark();setTimeout(apply,50);};
  window.setLightMode=function(){origLight();setTimeout(apply,50);};
})();

