/**
 * display.js — KPI Cards & Icons
 * SmartCity AI · India Urban Intelligence
 *
 * animateVal(id, target, fmt)         — animated number counter
 * updateDisplay(t, a, p)              — update all dashboard KPIs
 * fmtIN(v)                            — Indian locale number format
 */

/* ══════════════ DISPLAY ══════════════ */
const fmtIN=v=>Math.round(v*1e6).toLocaleString('en-IN');

function updateDisplay(t,a,p){
  S.pred={t,a,p};
  const gi=greenIdx(S.city,S.year);
  // KPIs
  animateVal('kv-pop',p,v=>fmtIN(v));
  document.getElementById('ks-pop').textContent=p.toFixed(2)+' Million';

  animateVal('kv-veh',t*18000,v=>Math.round(v).toLocaleString('en-IN'));
  document.getElementById('ks-veh').textContent='Index: '+t.toFixed(1);

  animateVal('kv-gc',gi,v=>v.toFixed(0));

  animateVal('kv-ti',a,v=>v.toFixed(0));
  document.getElementById('ks-ti').textContent=a>200?'Hazardous':a>150?'Unhealthy':a>100?'Moderate':'Good';

  // map hud - null-safe (elements differ between map modes)
  const _se=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  _se('mhud-city',S.city);_se('mhud-year',S.year);_se('mhud-model',S.model);
  _se('mhud-pop',p.toFixed(2)+'M');_se('mhud-traf',t.toFixed(1));_se('mhud-aqi',a.toFixed(0));
  _se('ghud-city',S.city);_se('ghud-year',S.year);_se('ghud-model',S.model);
  _se('ghud-pop',p.toFixed(2)+'M');_se('ghud-traf',t.toFixed(1));_se('ghud-aqi',a.toFixed(0));

  // status
  document.getElementById('st-city').textContent=S.city;
  document.getElementById('st-year').textContent=S.year;
  document.getElementById('st-model').textContent=S.model;
  document.getElementById('an-city').textContent=S.city+', '+S.year;
  document.getElementById('rep-city').textContent=S.city;
  document.getElementById('rep-year').textContent=S.year;
  const repModel=document.getElementById('rep-model');if(repModel)repModel.textContent=S.model;
  // Update reports quick stats
  const _qi=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  _qi('rep-pop',p.toFixed(2)+'M');_qi('rep-traf',t.toFixed(1));_qi('rep-aqi',a.toFixed(0));_qi('rep-gc',gi.toFixed(0)+'%');
  const chip=document.getElementById('yearChip'); if(chip) chip.textContent=S.year;
  const slider=document.getElementById('yearSlider'); if(slider) slider.value=S.year;
  const select=document.getElementById('yearInput'); if(select) select.value=S.year;
}

// Animated counter
function animateVal(id,target,fmt){
  const el=document.getElementById(id);if(!el)return;
  const start=parseFloat(el.dataset.raw||0)||0;
  el.dataset.raw=target;
  const dur=800,step=16,steps=dur/step;
  let i=0;
  const iv=setInterval(()=>{
    i++;
    const progress=i/steps;
    const ease=1-Math.pow(1-progress,3);
    const cur=start+(target-start)*ease;
    el.textContent=fmt(cur);
    if(i>=steps){el.textContent=fmt(target);clearInterval(iv);}
  },step);
}

