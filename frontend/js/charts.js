/**
 * charts.js — Chart.js Visualisations
 * SmartCity AI · India Urban Intelligence
 *
 * Uses Chart.js 4.4.0 (loaded via CDN in index.html)
 *
 * initCharts()    — create all chart instances on canvas elements
 * refreshCharts() — update all charts with latest prediction data
 */

/* ══════════════ CHARTS with rich transitions ══════════════ */
Chart.defaults.color='#64748b';
Chart.defaults.font.family="'Plus Jakarta Sans', system-ui";
Chart.defaults.font.size=11;
Chart.defaults.animation.duration=1100;
Chart.defaults.animation.easing='easeInOutQuart';

// Custom easing with staggered delay
Chart.defaults.animation.delay=(ctx)=>{if(ctx.type==='data')return ctx.dataIndex*60+200;return 0;};

const BASE={
  responsive:true,maintainAspectRatio:false,
  interaction:{mode:'index',intersect:false},
  plugins:{
    legend:{labels:{boxWidth:10,padding:16,usePointStyle:true,color:'#374151',font:{size:11,weight:'600'}}},
    tooltip:{
      backgroundColor:'rgba(255,255,255,.98)',
      borderColor:'#e2e8f0',borderWidth:1,
      titleColor:'#0f172a',bodyColor:'#334155',
      padding:12,cornerRadius:10,
      boxShadow:'0 8px 24px rgba(0,0,0,.1)',
      titleFont:{size:12,weight:'700'},
      bodyFont:{size:11},
    }
  },
  scales:{
    x:{grid:{color:'#f1f5f9',drawBorder:false},ticks:{color:'#94a3b8',maxTicksLimit:10,font:{size:10}}},
    y:{grid:{color:'#f1f5f9',drawBorder:false},ticks:{color:'#94a3b8',font:{size:10}}}
  }
};

function mkChart(id,type,datasets,extra={}){
  const ctx=document.getElementById(id);if(!ctx)return null;
  const opts=JSON.parse(JSON.stringify(BASE));
  Object.assign(opts,extra);
  if(extra.plugins)Object.assign(opts.plugins,extra.plugins);
  if(extra.scales)Object.assign(opts.scales,extra.scales);
  return new Chart(ctx.getContext('2d'),{type,data:{labels:[],datasets},options:opts});
}

function initCharts(){
  // Dashboard growth
  S.charts.growth=mkChart('c-growth','line',[
    {label:'Traffic Index',data:[],borderColor:'#1a56db',backgroundColor:'rgba(26,86,219,.07)',borderWidth:2.5,tension:.45,pointRadius:0,fill:true},
    {label:'AQI ÷3',data:[],borderColor:'#d97706',backgroundColor:'rgba(217,119,6,.07)',borderWidth:2.5,tension:.45,pointRadius:0,fill:true},
    {label:'Population ×5',data:[],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,.07)',borderWidth:2.5,tension:.45,pointRadius:0,fill:true},
  ]);
  // Dashboard donut
  S.charts.dist=mkChart('c-dist','doughnut',[{
    data:[0,0,0,0],
    backgroundColor:['rgba(124,58,237,.8)','rgba(26,86,219,.8)','rgba(22,163,74,.8)','rgba(217,119,6,.8)'],
    borderColor:'#fff',borderWidth:3,hoverOffset:8,
  }],{
    plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:12,usePointStyle:true}}},
    animation:{animateRotate:true,animateScale:true,duration:1400,easing:'easeInOutQuart',delay:200},
  });

  // Analytics
  S.charts.trend=mkChart('c-trend','line',[
    {label:'Traffic',data:[],borderColor:'#1a56db',borderWidth:2.5,tension:.45,pointRadius:0,fill:false},
    {label:'AQI ÷3',data:[],borderColor:'#d97706',borderWidth:2.5,tension:.45,pointRadius:0,fill:false},
    {label:'Pop ×5',data:[],borderColor:'#7c3aed',borderWidth:2.5,tension:.45,pointRadius:0,fill:false},
  ]);
  S.charts.donut=mkChart('c-donut','doughnut',[{
    data:[0,0,0],
    backgroundColor:['rgba(26,86,219,.8)','rgba(217,119,6,.8)','rgba(124,58,237,.8)'],
    borderColor:'#fff',borderWidth:3,hoverOffset:8,
  }],{
    plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:12,usePointStyle:true}}},
    animation:{animateRotate:true,animateScale:true,duration:1400,easing:'easeInOutQuart',delay:200},
  });
  S.charts.traf=mkChart('c-traf','bar',[{
    label:'Traffic',data:[],
    backgroundColor:(ctx)=>{
      const v=ctx.raw||0;
      return v>100?'rgba(220,38,38,.7)':v>70?'rgba(217,119,6,.7)':'rgba(26,86,219,.65)';
    },
    borderColor:(ctx)=>{const v=ctx.raw||0;return v>100?'#dc2626':v>70?'#d97706':'#1a56db';},
    borderWidth:1.5,borderRadius:4,borderSkipped:false,
  }],{plugins:{legend:{display:false}}});
  S.charts.aqiCh=mkChart('c-aqi','line',[{
    label:'AQI',data:[],borderColor:'#d97706',backgroundColor:'rgba(217,119,6,.1)',fill:true,tension:.45,borderWidth:2.5,pointRadius:0
  }],{plugins:{legend:{display:false}}});
  S.charts.popCh=mkChart('c-pop','line',[{
    label:'Population',data:[],borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,.1)',fill:true,tension:.45,borderWidth:2.5,pointRadius:0
  }],{plugins:{legend:{display:false}}});

  // Forecast
  S.charts.fc=mkChart('c-fc','line',[
    {label:'Traffic (norm)',data:[],borderColor:'#1a56db',borderWidth:2.5,tension:.45,pointRadius:0},
    {label:'AQI (norm)',data:[],borderColor:'#d97706',borderWidth:2.5,tension:.45,pointRadius:0},
    {label:'Pop (norm)',data:[],borderColor:'#7c3aed',borderWidth:2.5,tension:.45,pointRadius:0},
    {label:'Hist | Forecast',data:[],borderColor:'#cbd5e1',borderWidth:1.5,borderDash:[6,4],pointRadius:0,fill:false},
  ]);
  S.charts.acc=mkChart('c-acc','bar',[{
    label:'Accuracy %',data:[95,88,72],
    backgroundColor:['rgba(26,86,219,.75)','rgba(22,163,74,.75)','rgba(217,119,6,.75)'],
    borderColor:['#1a56db','#16a34a','#d97706'],
    borderWidth:2,borderRadius:6,borderSkipped:false,
  }],{
    plugins:{legend:{display:false}},
    scales:{y:{min:60,max:100,grid:{color:'#f1f5f9'}},x:{grid:{display:false},ticks:{color:'#374151',font:{size:11,weight:'600'}}}},
    animation:{delay:(ctx)=>ctx.dataIndex*150+300,duration:1200,easing:'easeInOutQuart'},
  });
  S.charts.ci=mkChart('c-ci','line',[
    {label:'Upper',data:[],borderColor:'rgba(26,86,219,.2)',backgroundColor:'rgba(26,86,219,.05)',fill:'+1',borderWidth:1,tension:.45,pointRadius:0},
    {label:'Predicted',data:[],borderColor:'#1a56db',borderWidth:2.5,tension:.45,pointRadius:4,pointBackgroundColor:'#1a56db',pointBorderColor:'#fff',pointBorderWidth:2},
    {label:'Lower',data:[],borderColor:'rgba(26,86,219,.2)',fill:'-1',borderWidth:1,tension:.45,pointRadius:0},
  ],{plugins:{legend:{display:false}}});
}

async function refreshCharts(){
  if(typeof Chart==='undefined'||!document.getElementById('c-growth'))return;
  const[tS,aS,pS]=await Promise.all([
    fetchRange(S.city,'traffic',S.model),
    fetchRange(S.city,'aqi',S.model),
    fetchRange(S.city,'population',S.model),
  ]);
  const labs=tS.map(d=>d.year);
  const tv=tS.map(d=>+d.value.toFixed(2));
  const av=aS.map(d=>+d.value.toFixed(2));
  const pv=pS.map(d=>+d.value.toFixed(3));
  const tM=Math.max(...tv)||1,aM=Math.max(...av)||1,pM=Math.max(...pv)||1;

  const upd=(ch,labels,dsets)=>{if(!ch)return;ch.data.labels=labels;dsets.forEach((d,i)=>{if(ch.data.datasets[i])ch.data.datasets[i].data=d;});ch.update();};

  upd(S.charts.growth,labs,[tv,av.map(v=>+(v/3).toFixed(1)),pv.map(v=>+(v*5).toFixed(1))]);
  const{t,a,p}=S.pred;
  if(S.charts.dist){S.charts.dist.data.labels=['Pop','Traffic','Green','AQI'];S.charts.dist.data.datasets[0].data=[Math.min(100,+p.toFixed(0)),Math.min(100,+t.toFixed(0)),+greenIdx(S.city,S.year).toFixed(0),Math.min(100,+(a/3).toFixed(0))];S.charts.dist.update();}

  upd(S.charts.trend,labs,[tv,av.map(v=>+(v/3).toFixed(1)),pv.map(v=>+(v*5).toFixed(1))]);
  if(S.charts.donut){S.charts.donut.data.labels=['Traffic','AQI','Population'];S.charts.donut.data.datasets[0].data=[Math.min(100,+t.toFixed(0)),Math.min(100,+(a/3).toFixed(0)),Math.min(100,+(p*4).toFixed(0))];S.charts.donut.update();}
  upd(S.charts.traf,labs,[tv]);
  upd(S.charts.aqiCh,labs,[av]);
  upd(S.charts.popCh,labs,[pv]);

  upd(S.charts.fc,labs,[tv.map(v=>+(v/tM*100).toFixed(1)),av.map(v=>+(v/aM*100).toFixed(1)),pv.map(v=>+(v/pM*100).toFixed(1)),labs.map(y=>y<=2024?50:null)]);

  const getAcc=m=>{if(!S.metrics||!S.metrics.traffic)return{LSTM:95,RF:88,LR:72}[m];return Object.values(S.metrics).reduce((s,f)=>s+(f[m]?.accuracy||0),0)/3;};
  if(S.charts.acc){S.charts.acc.data.datasets[0].data=[getAcc('LSTM'),getAcc('RF'),getAcc('LR')];S.charts.acc.update();}

  const futY=[];for(let y=new Date().getFullYear();y<=2100;y+=5)futY.push(y);
  const base=futY.map(y=>{const s=tS.find(d=>d.year===y);return s?+s.value.toFixed(2):fb(S.city,y,'traffic',S.model);});
  const unc=futY.map((_,i)=>base[i]*(0.02+i*.0045));
  if(S.charts.ci){S.charts.ci.data.labels=futY;S.charts.ci.data.datasets[0].data=base.map((v,i)=>+(v+unc[i]).toFixed(2));S.charts.ci.data.datasets[1].data=base;S.charts.ci.data.datasets[2].data=base.map((v,i)=>+Math.max(0,v-unc[i]).toFixed(2));S.charts.ci.update();}
}

