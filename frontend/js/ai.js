/**
 * ai.js — AI Advisor & Risk Assessment
 * SmartCity AI · India Urban Intelligence
 *
 * fallbackRecs(t, a, p)  — generate recommendations from ML values
 * refreshAI()             — populate AI Advisor tab:
 *     Recommendation cards, Prediction table (2025–2100),
 *     Risk bars (Traffic/AQI/Population), Model comparison
 */

/* ══════════════ AI PANEL ══════════════ */
function fallbackRecs(t,a,p){
  const r=[];
  if(t>100)r.push({icon:'🚧',title:'Emergency Road Infrastructure',priority:'CRITICAL',category:'Transport',description:`Traffic index ${t.toFixed(0)} → near-gridlock. Mandate elevated expressways, AI adaptive signals.`,impact:'Reduce congestion 40–55%',timeline:'5–8 yrs',cost_estimate:'₹60,000–1.2L Cr'});
  else if(t>70)r.push({icon:'🌉',title:'Flyover & Grade Separator Build',priority:'HIGH',category:'Transport',description:`Index ${t.toFixed(0)} → multi-level junctions needed on commercial arterials.`,impact:'Reduce congestion 25–35%',timeline:'3–5 yrs',cost_estimate:'₹15,000–45,000 Cr'});
  else r.push({icon:'🚲',title:'Smart Mobility & Green Commute',priority:'MEDIUM',category:'Transport',description:'Expand BRT, EV charging grid, last-mile micro-mobility.',impact:'Cut emissions 18–22%',timeline:'2–4 yrs',cost_estimate:'₹3,000–15,000 Cr'});
  if(a>200)r.push({icon:'🏭',title:'Pollution Emergency Protocol',priority:'CRITICAL',category:'Environment',description:`AQI ${a.toFixed(0)} — hazardous. Industrial caps, EV mandate, enforcement drones.`,impact:'Reduce AQI 60–80 pts',timeline:'3–6 yrs',cost_estimate:'₹30,000–80,000 Cr'});
  else if(a>120)r.push({icon:'🌳',title:'Urban Forest & Green Corridors',priority:'HIGH',category:'Environment',description:`AQI ${a.toFixed(0)} → plant 10M trees, rooftop gardens, 500-node sensor mesh.`,impact:'Improve AQI 25–40 pts',timeline:'4–7 yrs',cost_estimate:'₹8,000–24,000 Cr'});
  else r.push({icon:'🌿',title:'Preventive Green Infrastructure',priority:'LOW',category:'Environment',description:'AQI in range. Invest in biodiversity corridors and urban wetlands.',impact:'Sustain AQI baseline',timeline:'Ongoing',cost_estimate:'₹1,500–4,000 Cr'});
  if(p>20)r.push({icon:'🏙️',title:'Satellite City Development',priority:'CRITICAL',category:'Urban Planning',description:`${p.toFixed(1)}M pop → commission 4 satellite towns within 60km.`,impact:'Decongest core 30%',timeline:'10–15 yrs',cost_estimate:'₹1.5–4L Cr'});
  else r.push({icon:'🏘️',title:'Vertical Density & Rezoning',priority:'HIGH',category:'Urban Planning',description:'Transit-oriented development hubs, FSI reform, mixed-use zoning near metro.',impact:'Increase livable space 35%',timeline:'5–8 yrs',cost_estimate:'₹40,000–1L Cr'});
  r.push({icon:'🚇',title:'Metro & Mass Transit Expansion',priority:'HIGH',category:'Infrastructure',description:'Extend metro, hydrogen BRT on 20 corridors, unified digital ticketing.',impact:'35% modal shift from cars',timeline:'5–10 yrs',cost_estimate:'₹60,000–1.5L Cr'});
  if(S.year>=2050)r.push({icon:'🤖',title:'AI-Managed Smart City Grid',priority:'STRATEGIC',category:'Technology',description:'Autonomous traffic signals, AI energy grids, drone delivery backbone.',impact:'+50% urban efficiency',timeline:'2035–2050',cost_estimate:'₹2.5–6L Cr'});
  return r;
}

async function refreshAI(){
  if(!S.city) return;
  // Parallelize: prediction + recommendations can run concurrently
  const [predResult, data] = await Promise.all([
    (!S.pred.t && !S.pred.a && !S.pred.p)
      ? fetchPred(S.city,S.year,S.model).then(r=>{S.pred=r; return r;})
      : Promise.resolve(S.pred),
    apiFetch(`/recommendations?city=${S.city}&year=${S.year}&model=${S.model}`),
  ]);
  let recs=[],t=S.pred.t,a=S.pred.a,p=S.pred.p;
  if(data&&data.recommendations){recs=data.recommendations;t=data.metrics.traffic;a=data.metrics.aqi;p=data.metrics.population;}
  else recs=fallbackRecs(t,a,p);

  const _s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  _s('recMeta',`${recs.length} recommendations · ${S.city} · ${S.year}`);
  _s('predMeta',`${S.city} · ${S.model}`);
  _s('riskLbl',`${S.city}, ${S.year}`);
  _s('cmpLbl',S.year);
  _s('navBadge',recs.length);

  const PC={CRITICAL:'#dc2626',HIGH:'#d97706',MEDIUM:'#1a56db',LOW:'#16a34a',STRATEGIC:'#7c3aed'};
  const PT={CRITICAL:'t-c',HIGH:'t-h',MEDIUM:'t-m',LOW:'t-l',STRATEGIC:'t-s'};
  const PP={CRITICAL:85,HIGH:65,MEDIUM:42,LOW:28,STRATEGIC:92};

  document.getElementById('recCards').innerHTML=recs.map((r,i)=>`
    <div class="rec-card" style="--rc:${PC[r.priority]||'#1a56db'};animation-delay:${i*.06}s">
      <div class="rc-top"><div class="rc-icon">${r.icon}</div>
        <div class="rc-hd"><div class="rc-title">${r.title}</div>
          <div class="rc-tags"><span class="tag ${PT[r.priority]||'t-m'}">${r.priority}</span><span class="tag t-cat">${r.category}</span></div>
        </div>
      </div>
      <div class="rc-desc">${r.description}</div>
      <div class="rc-meta"><div class="rc-mi">Impact: <b>${r.impact}</b></div><div class="rc-mi">Timeline: <b>${r.timeline}</b></div><div class="rc-mi">Cost: <b>${r.cost_estimate}</b></div></div>
      <div class="rc-bar"><div class="rc-bar-fill" style="width:${PP[r.priority]||40}%"></div></div>
    </div>`).join('');

  const currentYear=new Date().getFullYear();
  const futYrs=[currentYear,currentYear+5,currentYear+10,currentYear+20,currentYear+30,currentYear+50,2100].filter((year,index,array)=>year<=2100&&array.indexOf(year)===index);
  // Parallelize: future-year predictions + model comparison are independent
  const [yearResults, mcD] = await Promise.all([
    Promise.all(futYrs.map(async y=>{
      const d=await apiFetch(`/predict/all?city=${S.city}&year=${y}&model=${S.model}`);
      let ft,fa,fp;
      if(d&&d.predictions){ft=d.predictions.traffic.value;fa=d.predictions.aqi.value;fp=d.predictions.population.value;}
      else{ft=fb(S.city,y,'traffic',S.model);fa=fb(S.city,y,'aqi',S.model);fp=fb(S.city,y,'population',S.model);}
      const risk=ft>100&&fa>180?'<span class="risk-c">CRITICAL</span>':ft>70||fa>120?'<span class="risk-h">HIGH</span>':ft>50||fa>80?'<span class="risk-m">MEDIUM</span>':'<span class="risk-l">LOW</span>';
      return`<tr><td class="td-yr">${y}</td><td class="${ft>100?'td-u':ft<50?'td-d':'td-m'}">${ft.toFixed(1)}</td><td class="${fa>150?'td-u':fa<60?'td-d':'td-m'}">${fa.toFixed(0)}</td><td class="td-n" style="color:var(--purple);font-weight:600;">${fp.toFixed(2)}</td><td>${risk}</td></tr>`;
    })),
    Promise.all(['LSTM','RF','LR'].map(async m=>{
      const d=await apiFetch(`/predict/all?city=${S.city}&year=${S.year}&model=${m}`);
      if(d&&d.predictions){const av=Object.values(d.predictions).reduce((s,f)=>s+(f.metrics?.accuracy||0),0)/3;return{m,t:d.predictions.traffic.value.toFixed(1),a:d.predictions.aqi.value.toFixed(0),acc:av.toFixed(1)};}
      return{m,t:fb(S.city,S.year,'traffic',m).toFixed(1),a:fb(S.city,S.year,'aqi',m).toFixed(0),acc:{LSTM:'95.0',RF:'88.3',LR:'72.1'}[m]};
    })),
  ]);
  document.getElementById('predBody').innerHTML=yearResults.join('');

  const tR=Math.min(100,t/1.5),aR=Math.min(100,a/3.5),pR=Math.min(100,p*3);
  const riskData=[
    {l:'Traffic Congestion',v:tR,c:'#6366f1',icon:'🚦'},
    {l:'Air Pollution (AQI)',v:aR,c:'#f97316',icon:'💨'},
    {l:'Population Pressure',v:pR,c:'#a855f7',icon:'👥'},
  ];
  const rb=document.getElementById('riskBars');
  if(rb){
    rb.innerHTML=riskData.map((r,i)=>`<div class="rbi">
      <div class="rbi-row">
        <span class="rbi-lbl">${r.icon} ${r.l}</span>
        <span class="rbi-pct" id="rbp-${i}" style="color:${r.c}">0%</span>
      </div>
      <div class="rbi-track">
        <div class="rbi-fill" id="rbf-${i}" style="width:0%;background:linear-gradient(90deg,${r.c}99,${r.c});transition:width 1.4s cubic-bezier(.34,1.1,.64,1)"></div>
      </div>
    </div>`).join('');
    riskData.forEach((r,i)=>{
      setTimeout(()=>{
        const fill=document.getElementById('rbf-'+i);
        const pct =document.getElementById('rbp-'+i);
        if(fill) fill.style.width=r.v.toFixed(0)+'%';
        let n=0,target=Math.round(r.v);
        const iv=setInterval(()=>{n=Math.min(n+2,target);if(pct)pct.textContent=n+'%';if(n>=target)clearInterval(iv);},18);
      },i*220+200);
    });
  }

  document.getElementById('mcRows').innerHTML=mcD.map(mc=>`
    <div class="mc-row"><div class="mc-name">${mc.m}</div>
    <div class="mc-vals">Traffic: <b>${mc.t}</b> · AQI: <b>${mc.a}</b></div>
    <div class="mc-acc">${mc.acc}%</div></div>`).join('');
}

