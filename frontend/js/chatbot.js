/**
 * chatbot.js — SmartCityAI AI Chatbot Assistant
 * Provides conversational interface to city data, predictions, and recommendations
 * Enhanced with comprehensive project-specific knowledge
 */

let chatbotOpen = false;
const chatHistory = [];

function toggleChatbot() {
  const win = document.getElementById('chatbot-window');
  const toggle = document.getElementById('chatbot-toggle');
  chatbotOpen = !chatbotOpen;
  if (chatbotOpen) {
    win.style.display = 'flex';
    win.style.animation = 'chatbotSlideIn .3s cubic-bezier(.16,1,.3,1) both';
    toggle.textContent = '✕';
    if (chatHistory.length === 0) {
      addBotMessage(`Hi! 👋 I'm your **SmartCityAI assistant**.\n\nI can help you with:\n• 🚦 Traffic forecasts\n• 💨 Air quality (AQI)\n• 👥 Population predictions\n• 📊 Risk assessments\n• ⚖️ City comparisons\n• 💡 AI recommendations\n• 🗺️ Map & analytics\n• ⚙️ Settings & features\n\nAsk me anything about ${S.city || 'your city'}!`);
    }
    document.getElementById('chatbot-input').focus();
  } else {
    win.style.display = 'none';
    toggle.textContent = '💬';
  }
}

function addBotMessage(text) {
  const container = document.getElementById('chatbot-messages');
  const div = document.createElement('div');
  div.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;animation:chatFadeIn .25s ease both;';
  div.style.background = 'linear-gradient(135deg,#6366f1,#7c3aed)';
  div.style.color = '#fff';
  div.style.alignSelf = 'flex-start';
  div.innerHTML = text.replace(/\n/g, '<br>');
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  chatHistory.push({ role: 'bot', text });
}

function addUserMessage(text) {
  const container = document.getElementById('chatbot-messages');
  const div = document.createElement('div');
  div.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;animation:chatFadeIn .25s ease both;background:var(--card,#f1f5f9);color:var(--text-1,#0f172a);border:1px solid var(--border,#e2e8f0);align-self:flex-end;';
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  chatHistory.push({ role: 'user', text });
}

function sendChatMessage() {
  const input = document.getElementById('chatbot-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addUserMessage(msg);
  setTimeout(() => processUserQuery(msg), 400);
}

function processUserQuery(query) {
  const q = query.toLowerCase();
  const city = S.city || 'Hyderabad';
  const year = S.year || new Date().getFullYear();
  const model = S.model || 'LSTM';

  // ── Greeting ──
  if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|namaste)/i.test(q)) {
    addBotMessage(`Hello! 👋 Welcome to SmartCityAI.\n\nCurrently viewing: **${city}** · ${year} · ${model}\n\nWhat would you like to know?`);
    return;
  }

  // ── What is SmartCityAI ──
  if (/what\s*(is|are|does)\s*(smartcity|smart\s*city|this|the\s*app|the\s*platform|the\s*project)/i.test(q) || /^(tell me about|about)\s*(smartcity|this)/i.test(q)) {
    addBotMessage(`🏙️ **SmartCityAI** is an AI-powered urban intelligence platform for **20 major Indian cities**.\n\nIt predicts:\n• 🚦 Traffic congestion\n• 💨 Air quality (AQI)\n• 👥 Population growth\n\nFrom **2025 to 2100** using 3 ML models:\n• LSTM (~95% accuracy)\n• Random Forest (~88%)\n• Linear Regression (~72%)\n\nFeatures include Dashboard, Map View, Analytics, ML Forecast, AI Advisor, Compare, and Reports.`);
    return;
  }

  // ── Traffic query ──
  if (/\b(traffic|congestion|commute|road|jam|gridlock)\b/i.test(q)) {
    const t = fb(city, year, 'traffic', model);
    const risk = t > 100 ? '🔴 Critical' : t > 70 ? '🟠 High' : t > 50 ? '🟡 Moderate' : '🟢 Low';
    addBotMessage(`🚦 **Traffic Analysis — ${city} ${year}**\n\nTraffic Index: **${t.toFixed(1)}**\nRisk Level: ${risk}\n\nModel: ${model}${t > 100 ? '\n\n⚠️ Severe congestion. Emergency infrastructure needed.' : t > 70 ? '\n\n⚠️ High congestion. Flyovers and grade separators recommended.' : '\n\n✅ Traffic levels are manageable.'}`);
    return;
  }

  // ── AQI query ──
  if (/\b(aqi|air\s*quality|pollution|pm2\.5|smog|clean\s*air|emission)\b/i.test(q)) {
    const a = fb(city, year, 'aqi', model);
    const status = a > 200 ? '🔴 Hazardous' : a > 150 ? '🟠 Very Unhealthy' : a > 100 ? '🟠 Unhealthy' : a > 50 ? '🟡 Moderate' : '🟢 Good';
    addBotMessage(`💨 **Air Quality — ${city} ${year}**\n\nAQI: **${a.toFixed(0)}**\nStatus: ${status}\n\nModel: ${model}${a > 120 ? '\n\n⚠️ High pollution. Recommend:\n• Urban forest & green corridors\n• EV mandate\n• Industrial emission controls' : '\n\n✅ Air quality is within acceptable range.'}`);
    return;
  }

  // ── Population query ──
  if (/\b(population|pop|people|residents|inhabitants|demographic|growth|density)\b/i.test(q)) {
    const p = fb(city, year, 'population', model);
    const baseP = fb(city, new Date().getFullYear(), 'population', model);
    const growth = ((p - baseP) / baseP * 100).toFixed(1);
    addBotMessage(`👥 **Population Forecast — ${city} ${year}**\n\nPredicted Population: **${p.toFixed(2)}M**\nGrowth from now: ${growth > 0 ? '+' : ''}${growth}%\n\nModel: ${model}${p > 20 ? '\n\n⚠️ High population pressure. Consider:\n• Satellite city development\n• Vertical density & rezoning\n• Transit-oriented development' : p > 12 ? '\n\n🟡 Moderate growth. Plan for infrastructure expansion.' : '\n\n✅ Growth within sustainable limits.'}`);
    return;
  }

  // ── Green cover ──
  if (/\b(green\s*cover|vegetation|tree|forest|park|green\s*space|foliage)\b/i.test(q)) {
    const gi = greenIdx(city, year);
    addBotMessage(`🌿 **Green Cover — ${city} ${year}**\n\nGreen Cover Index: **${gi.toFixed(0)}%**\n\n${gi < 25 ? '🔴 Low green cover. Reforestation urgently needed.\n\nRecommendations:\n• Plant 10M+ trees\n• Rooftop gardens\n• Urban wetlands\n• Biodiversity corridors' : gi < 40 ? '🟡 Moderate. Could improve.\n\nConsider expanding urban forests and green corridors.' : '✅ Good green infrastructure.\n\nMaintain current coverage and expand biodiversity.'}`);
    return;
  }

  // ── Risk query ──
  if (/\b(risk|danger|threat|safety|assessment|vulnerable)\b/i.test(q)) {
    const t = fb(city, year, 'traffic', model);
    const a = fb(city, year, 'aqi', model);
    const p = fb(city, year, 'population', model);
    const overall = (t / 150 * 33 + a / 300 * 33 + p / 60 * 34).toFixed(0);
    const level = overall > 70 ? '🔴 CRITICAL' : overall > 50 ? '🟠 HIGH' : overall > 30 ? '🟡 MODERATE' : '🟢 LOW';
    addBotMessage(`📊 **Risk Assessment — ${city} ${year}**\n\nOverall Risk: ${level} (${overall}%)\n\nTraffic: ${t > 100 ? '🔴' : t > 70 ? '🟠' : '🟢'} ${t.toFixed(1)}\nAir Quality: ${a > 120 ? '🔴' : a > 80 ? '🟠' : '🟢'} ${a.toFixed(0)}\nPopulation: ${p > 20 ? '🔴' : p > 12 ? '🟠' : '🟢'} ${p.toFixed(2)}M\n\n${overall > 50 ? '⚠️ Multiple risk factors detected. Comprehensive urban planning recommended.' : '✅ Risk levels are within manageable range.'}`);
    return;
  }

  // ── Prediction / forecast query ──
  if (/\b(predict|forecast|future|20[3-9]\d|2100|tomorrow|next\s*year|projection)\b/i.test(q)) {
    const t = fb(city, year, 'traffic', model);
    const a = fb(city, year, 'aqi', model);
    const p = fb(city, year, 'population', model);
    const gi = greenIdx(city, year);
    addBotMessage(`🔮 **Prediction Summary — ${city} ${year}**\n\nModel: ${model}\n\n• Population: **${p.toFixed(2)}M**\n• Traffic Index: **${t.toFixed(1)}**\n• AQI: **${a.toFixed(0)}**\n• Green Cover: **${gi.toFixed(0)}%**\n\nView the **ML Forecast** tab for full 100-year trajectory with charts.`);
    return;
  }

  // ── Compare query ──
  if (/\b(compare|versus|vs|difference|between|comparison)\b/i.test(q)) {
    const cities = Object.keys(CITIES).sort();
    addBotMessage(`⚖️ **City Comparison**\n\nYou can compare any two cities! Click the **Compare** tab in the sidebar.\n\nHow to use:\n1. Select City A\n2. Select City B\n3. Choose a year\n4. Click **Compare Cities**\n\nSupported: ${cities.slice(0, 10).join(', ')} and ${cities.length - 10} more.\n\nYou'll see side-by-side KPIs, charts, tables, and a summary.`);
    return;
  }

  // ── Recommendations query ──
  if (/\b(recommend|suggest|advice|solution|improve|action|plan)\b/i.test(q)) {
    const t = fb(city, year, 'traffic', model);
    const a = fb(city, year, 'aqi', model);
    const p = fb(city, year, 'population', model);
    const recs = fallbackRecs(t, a, p);
    const top3 = recs.slice(0, 3);
    addBotMessage(`💡 **Top Recommendations for ${city}**\n\n${top3.map((r, i) => `${i + 1}. ${r.icon} **${r.title}** (${r.priority})\n   ${r.description}\n   Impact: ${r.impact} | Cost: ${r.cost_estimate}`).join('\n\n')}\n\nVisit the **AI Advisor** tab for the full list with all ${recs.length} recommendations.`);
    return;
  }

  // ── Model query ──
  if (/\b(model|algorithm|lstm|random\s*forest|linear|machine\s*learning|ml|accuracy|rf|lr)\b/i.test(q)) {
    addBotMessage(`🧠 **Prediction Models**\n\nSmartCityAI uses 3 ML models:\n\n• **LSTM** — Long Short-Term Memory\n  Best for time-series urban data\n  Accuracy: ~95%\n\n• **RF** — Random Forest\n  Ensemble method, balanced performance\n  Accuracy: ~88%\n\n• **LR** — Linear Regression\n  Baseline model\n  Accuracy: ~72%\n\nCurrent model: **${model}**\n\nSwitch models from the Dashboard predictor card.`);
    return;
  }

  // ── City list / supported cities ──
  if (/\b(city|cities|which|list|show|available|supported|all\s*cities)\b/i.test(q)) {
    const cities = Object.keys(CITIES).sort();
    addBotMessage(`🏙️ **Supported Cities** (${cities.length})\n\n${cities.map(c => `• ${c}`).join('\n')}\n\nSelect any city from the Dashboard dropdown to view predictions.`);
    return;
  }

  // ── Map query ──
  if (/\b(map|gmap|google\s*map|satellite|street\s*view|explorer|place|location)\b/i.test(q)) {
    addBotMessage(`🗺️ **Map View**\n\nThe Map View shows:\n• Google Maps satellite/street view\n• City explorer with famous places\n• Wikipedia photos of landmarks\n• Traffic/AQI overlay panels\n\nTo use:\n1. Click **Map View** in sidebar\n2. Select a city on the Dashboard first\n3. Toggle map layers (Traffic, AQI, Street View, Transit)\n\nThe map centers on ${city} coordinates.`);
    return;
  }

  // ── Analytics query ──
  if (/\b(analytics|chart|graph|trend|visualization|data\s*visual)\b/i.test(q)) {
    addBotMessage(`📈 **Analytics Dashboard**\n\nThe Analytics tab shows:\n• Population growth trend (line chart)\n• Traffic vs AQI comparison (line chart)\n• Metric distribution (donut chart)\n• Traffic bar chart\n• Confidence index trend\n\nAll charts animate with smooth transitions and update live when you change city/year/model.`);
    return;
  }

  // ── Settings query ──
  if (/\b(setting|config|prefer|option|toggle|dark\s*mode|theme|appearance)\b/i.test(q)) {
    addBotMessage(`⚙️ **Settings**\n\nAvailable settings:\n\n**Profile** — Update name & email\n**Security** — Change password\n**Urban Intelligence** — Default city, model, view, year\n**AI Advisor** — Recommendation toggles, detail level\n**Appearance** — Dark mode, reduced motion, compact view, tooltips\n**Analytics** — Page view stats\n\nChanges save automatically to your browser.`);
    return;
  }

  // ── Reports query ──
  if (/\b(report|export|download|pdf|csv|file|save)\b/i.test(q)) {
    addBotMessage(`📄 **Reports**\n\nTwo report types available:\n\n1. **Structured Report** (PDF-style)\n   Executive summary, KPIs, forecast tables, ML analysis, AI insights, recommendations\n\n2. **Visualized Data Report**\n   Charts, trend lines, risk gauges, model comparison, key insights\n\nGo to **Reports** tab → click Download.\n\nReports use actual ${city} ${year} data.`);
    return;
  }

  // ── Best / worst cities ──
  if (/\b(best|worst|safest|cleanest|most\s*(polluted|congested|populated)|lowest|highest)\b/i.test(q)) {
    const cities = Object.keys(CITIES).sort();
    const t = fb(city, year, 'traffic', model);
    const a = fb(city, year, 'aqi', model);
    const p = fb(city, year, 'population', model);
    // Find best/worst for each metric
    let bestT = { city: '', val: Infinity };
    let worstT = { city: '', val: -Infinity };
    let bestA = { city: '', val: Infinity };
    let worstA = { city: '', val: -Infinity };
    cities.forEach(c => {
      const ct = fb(c, year, 'traffic', model);
      const ca = fb(c, year, 'aqi', model);
      if (ct < bestT.val) bestT = { city: c, val: ct };
      if (ct > worstT.val) worstT = { city: c, val: ct };
      if (ca < bestA.val) bestA = { city: c, val: ca };
      if (ca > worstA.val) worstA = { city: c, val: ca };
    });
    addBotMessage(`🏆 **City Rankings — ${year}**\n\n**Traffic (lower is better):**\n🟢 Best: ${bestT.city} (${bestT.val.toFixed(1)})\n🔴 Worst: ${worstT.city} (${worstT.val.toFixed(1)})\n\n**Air Quality (lower is better):**\n🟢 Best: ${bestA.city} (${bestA.val.toFixed(0)})\n🔴 Worst: ${worstA.city} (${worstA.val.toFixed(0)})\n\nCurrent city **${city}**: Traffic ${t.toFixed(1)} | AQI ${a.toFixed(0)}`);
    return;
  }

  // ── Specific year query ──
  if (/\b(what\s*about|how\s*(about|will)|in|for)\s*(\d{4})\b/i.test(q)) {
    const match = q.match(/(\d{4})/);
    if (match) {
      const yr = parseInt(match[1]);
      if (yr >= 2025 && yr <= 2100) {
        const t = fb(city, yr, 'traffic', model);
        const a = fb(city, yr, 'aqi', model);
        const p = fb(city, yr, 'population', model);
        const gi = greenIdx(city, yr);
        addBotMessage(`🔮 **${city} in ${yr}**\n\n• Population: **${p.toFixed(2)}M**\n• Traffic: **${t.toFixed(1)}** ${t > 100 ? '🔴' : t > 70 ? '🟠' : '🟢'}\n• AQI: **${a.toFixed(0)}** ${a > 120 ? '🔴' : a > 80 ? '🟠' : '🟢'}\n• Green Cover: **${gi.toFixed(0)}%**\n\nModel: ${model}`);
        return;
      }
    }
  }

  // ── Navigation / how to use ──
  if (/\b(how\s*(do|to|can)|navigate|use|menu|sidebar|tab|feature)\b/i.test(q)) {
    addBotMessage(`📖 **How to Use SmartCityAI**\n\n**Sidebar tabs:**\n• 📊 **Dashboard** — Select city, year, model → run predictions\n• 🗺️ **Map View** — Explore city on Google Maps\n• 📈 **Analytics** — Charts & trend analysis\n• 🔮 **ML Forecast** — 100-year prediction table\n• 🤖 **AI Advisor** — Recommendations & risk assessment\n• ⚖️ **Compare** — Side-by-side city comparison\n• 📄 **Reports** — Download structured reports\n• ⚙️ **Settings** — Customize your experience\n\n**Quick start:** Select a city → Choose year → Click Predict!`);
    return;
  }

  // ── Database / account ──
  if (/\b(account|database|login|register|signup|password|auth|profile)\b/i.test(q)) {
    addBotMessage(`🔐 **Account & Authentication**\n\nSmartCityAI uses email/password authentication:\n\n• **Register** — Create account at /register.html\n• **Login** — Sign in at /login.html\n• **Forgot Password** — Reset at /forgot-password.html\n• **Profile** — Update name & email in Settings\n• **Security** — Change password in Settings\n\nYour data is stored securely in SQLite with bcrypt-hashed passwords.`);
    return;
  }

  // ── Help ──
  if (/\b(help|what can you|commands|options|menu)\b/i.test(q)) {
    addBotMessage(`❓ **How I Can Help**\n\n**Data queries:**\n• "Traffic in ${city}"\n• "AQI for ${year}"\n• "Population forecast"\n• "Green cover status"\n• "Risk assessment"\n\n**Features:**\n• "How do I use the dashboard?"\n• "Tell me about SmartCityAI"\n• "What models do you use?"\n• "Which cities are supported?"\n• "How to compare cities?"\n• "How to download reports?"\n\n**Insights:**\n• "Best city for traffic"\n• "What about 2050?"\n• "Recommendations for ${city}"`);
    return;
  }

  // ── Default ──
  addBotMessage(`I'm not sure I understand that. Try asking about:\n\n• 🚦 Traffic conditions\n• 💨 Air quality (AQI)\n• 👥 Population forecasts\n• 🌿 Green cover\n• 📊 Risk assessments\n• ⚖️ City comparisons\n• 💡 AI recommendations\n• 🗺️ Map features\n• 📄 Reports & downloads\n• ⚙️ Settings\n\nOr type **help** for all options.`);
}

// Add chatbot animation CSS
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes chatbotSlideIn { from { opacity:0; transform:translateY(12px) scale(.96); } to { opacity:1; transform:none; } }
    @keyframes chatFadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
    #chatbot-window { box-shadow: 0 12px 40px rgba(0,0,0,.18); }
    #chatbot-window::-webkit-scrollbar { width: 5px; }
    #chatbot-window::-webkit-scrollbar-track { background: transparent; }
    #chatbot-window::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 10px; }
    #chatbot-toggle { transition: transform .2s, background .2s; }
    #chatbot-toggle:hover { transform: scale(1.08); }
    #chatbot-messages::-webkit-scrollbar { width: 5px; }
    #chatbot-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 10px; }
  `;
  document.head.appendChild(style);
})();
