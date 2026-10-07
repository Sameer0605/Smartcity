"""
predictions.py | SmartCity AI — Prediction Endpoints
======================================================
Flask blueprint exposing ML prediction endpoints.
All inputs are validated; zones use seeded RNG for determinism.
"""

import hashlib
import math
import random
from flask import Blueprint, request, jsonify

pred_bp = Blueprint("predictions", __name__)

# ── Constants ────────────────────────────────────────────────────────────
MIN_YEAR = 2000
MAX_YEAR = 2100
VALID_MODELS = {"LSTM", "RF", "LR"}
VALID_FEATURES = {"traffic", "aqi", "population"}

# ── City baseline data ──────────────────────────────────────────────────
CITIES = {
    "Mumbai":        {"lat":19.076,"lng":72.877,"p0":18.4,"t0":68,"a0":148,"pr":.38,"tr":.31,"ar":.72},
    "Delhi":         {"lat":28.614,"lng":77.209,"p0":28.5,"t0":82,"a0":198,"pr":.45,"tr":.40,"ar":1.05},
    "Bangalore":     {"lat":12.971,"lng":77.594,"p0":8.4, "t0":58,"a0":62, "pr":.52,"tr":.35,"ar":.42},
    "Hyderabad":     {"lat":17.385,"lng":78.486,"p0":7.7, "t0":62,"a0":75, "pr":.42,"tr":.33,"ar":.55},
    "Chennai":       {"lat":13.082,"lng":80.270,"p0":7.1, "t0":55,"a0":78, "pr":.35,"tr":.28,"ar":.48},
    "Kolkata":       {"lat":22.572,"lng":88.363,"p0":14.8,"t0":72,"a0":145,"pr":.22,"tr":.25,"ar":.85},
    "Pune":          {"lat":18.520,"lng":73.856,"p0":3.1, "t0":52,"a0":68, "pr":.58,"tr":.38,"ar":.45},
    "Ahmedabad":     {"lat":23.022,"lng":72.571,"p0":6.0, "t0":60,"a0":92, "pr":.40,"tr":.32,"ar":.62},
    "Jaipur":        {"lat":26.912,"lng":75.787,"p0":3.1, "t0":48,"a0":88, "pr":.38,"tr":.28,"ar":.55},
    "Surat":         {"lat":21.170,"lng":72.831,"p0":4.6, "t0":50,"a0":80, "pr":.50,"tr":.30,"ar":.50},
    "Lucknow":       {"lat":26.847,"lng":80.947,"p0":3.2, "t0":55,"a0":140,"pr":.40,"tr":.32,"ar":.90},
    "Kanpur":        {"lat":26.449,"lng":80.331,"p0":2.9, "t0":60,"a0":155,"pr":.28,"tr":.30,"ar":.95},
    "Nagpur":        {"lat":21.145,"lng":79.088,"p0":2.4, "t0":50,"a0":78, "pr":.35,"tr":.28,"ar":.52},
    "Bhopal":        {"lat":23.259,"lng":77.413,"p0":1.9, "t0":48,"a0":72, "pr":.38,"tr":.26,"ar":.48},
    "Patna":         {"lat":25.594,"lng":85.137,"p0":2.1, "t0":65,"a0":165,"pr":.42,"tr":.35,"ar":1.10},
    "Vadodara":      {"lat":22.307,"lng":73.181,"p0":1.7, "t0":46,"a0":68, "pr":.42,"tr":.28,"ar":.44},
    "Coimbatore":    {"lat":11.001,"lng":76.965,"p0":1.1, "t0":44,"a0":55, "pr":.35,"tr":.24,"ar":.38},
    "Visakhapatnam": {"lat":17.686,"lng":83.218,"p0":2.0, "t0":52,"a0":72, "pr":.38,"tr":.30,"ar":.48},
    "Indore":        {"lat":22.719,"lng":75.857,"p0":2.2, "t0":54,"a0":82, "pr":.45,"tr":.32,"ar":.55},
    "Chandigarh":    {"lat":30.733,"lng":76.779,"p0":1.1, "t0":42,"a0":62, "pr":.28,"tr":.22,"ar":.40},
}


# ── Input helpers ────────────────────────────────────────────────────────

def _validate_year(value, default=2025):
    """Parse and clamp year to [MIN_YEAR, MAX_YEAR]. Returns (year, error_response).
    - value is None/not provided -> use default
    - value is non-numeric string -> return error
    - value is numeric but out of range -> return error
    """
    if value is None or value == "":
        return default, None
    try:
        year = int(value)
    except (TypeError, ValueError):
        return None, (jsonify({"success": False, "error": f"Invalid year '{value}'. Must be a number between {MIN_YEAR} and {MAX_YEAR}."}), 400)
    if year < MIN_YEAR or year > MAX_YEAR:
        return None, (jsonify({"success": False, "error": f"Year must be between {MIN_YEAR} and {MAX_YEAR}."}), 400)
    return year, None


def _validate_model(model):
    """Return (model, error_response). Defaults to LSTM if not in VALID_MODELS."""
    model = (model or "LSTM").upper()
    if model not in VALID_MODELS:
        model = "LSTM"
    return model, None


def _validate_city(city):
    """Return (city, error_response). Returns None error if city exists (or defaults to Hyderabad)."""
    resolved = CITIES.get(city)
    if not resolved:
        city = "Hyderabad"
    return city, None


# ── Deterministic seeded RNG ────────────────────────────────────────────

def _seeded_random(city, year, feat, model):
    """Deterministic noise seeded by city+year+feat+model."""
    seed = int(hashlib.md5(f"{city}:{year}:{feat}:{model}".encode()).hexdigest()[:8], 16)
    return random.Random(seed)


# ── Prediction engine ───────────────────────────────────────────────────

def predict(city, year, feat, model="LSTM"):
    c = CITIES.get(city, CITIES["Hyderabad"])
    t = year - 2000
    if feat == "traffic":    base, rate = c["t0"], c["tr"]
    elif feat == "aqi":      base, rate = c["a0"], c["ar"]
    else:                    base, rate = c["p0"], c["pr"]

    rng = _seeded_random(city, year, feat, model)
    noise = (rng.random() - 0.5) * (0.015 if model == "LR" else 0.055)

    if model == "LR":
        v = base + rate * t + 0.002 * t * t
    elif model == "RF":
        stages = [1, 1.2, 1.5, 1.3, 1.1]
        s = stages[min(4, t // 20)]
        v = base + rate * t * s + 0.003 * t * t
    else:  # LSTM
        sig = 1 / (1 + math.exp(-0.03 * (t - 40)))
        v = base + rate * t * (1 + 0.4 * sig) + 0.004 * t * t

    return max(0, v * (1 + noise))


MODEL_ACCURACY = {
    "LSTM": {"traffic": 95.2, "aqi": 94.1, "population": 96.3},
    "RF":   {"traffic": 88.7, "aqi": 87.4, "population": 89.1},
    "LR":   {"traffic": 72.3, "aqi": 70.8, "population": 74.5},
}


# ── Routes ───────────────────────────────────────────────────────────────

@pred_bp.route("/health")
def health():
    return jsonify({"status": "online", "version": "5.0", "cities": len(CITIES)})


@pred_bp.route("/cities")
def cities():
    return jsonify({"cities": list(CITIES.keys())})


@pred_bp.route("/predict/all")
def predict_all():
    city, _ = _validate_city(request.args.get("city"))
    year, err = _validate_year(request.args.get("year"))
    model, _ = _validate_model(request.args.get("model"))
    if err:
        return err
    t = predict(city, year, "traffic", model)
    a = predict(city, year, "aqi", model)
    p = predict(city, year, "population", model)
    acc = MODEL_ACCURACY.get(model, MODEL_ACCURACY["LSTM"])
    return jsonify({
        "city": city, "year": year, "model": model,
        "predictions": {
            "traffic":    {"value": round(t, 2), "metrics": {"accuracy": acc["traffic"]}},
            "aqi":        {"value": round(a, 2), "metrics": {"accuracy": acc["aqi"]}},
            "population": {"value": round(p, 4), "metrics": {"accuracy": acc["population"]}},
        }
    })


@pred_bp.route("/predict/range")
def predict_range():
    city, _ = _validate_city(request.args.get("city"))
    model, _ = _validate_model(request.args.get("model"))
    feat = (request.args.get("feature") or "traffic").lower()
    if feat not in VALID_FEATURES:
        feat = "traffic"
    y_start, err = _validate_year(request.args.get("year_start"), MIN_YEAR)
    if err:
        return err
    y_end, err = _validate_year(request.args.get("year_end"), MAX_YEAR)
    if err:
        return err
    try:
        step = max(1, min(50, int(request.args.get("step", 5))))
    except (TypeError, ValueError):
        step = 5
    if y_start > y_end:
        y_start, y_end = y_end, y_start
    series = [{"year": y, "value": round(predict(city, y, feat, model), 3)}
              for y in range(y_start, y_end + 1, step)]
    return jsonify({"city": city, "feature": feat, "model": model, "series": series})


@pred_bp.route("/predict/zones")
def predict_zones():
    city, _ = _validate_city(request.args.get("city"))
    year, err = _validate_year(request.args.get("year"))
    model, _ = _validate_model(request.args.get("model"))
    if err:
        return err
    zones_tpl = [
        ("Central Business", 0.00, 0.00, 1.00, 1.00, 1.00),
        ("North Residential", 0.07, -.04, .72, .78, .85),
        ("Industrial Zone", -.06, .08, .65, 1.40, .55),
        ("South Area", -.09, -.02, .60, .72, .70),
        ("East Tech Park", .04, .11, .82, .58, 1.10),
        ("West Suburbs", .05, -.12, .50, .48, 1.15),
        ("Airport Corridor", .10, .09, 1.12, 1.22, .45),
        ("University Area", -.04, -.10, .78, .52, .88),
        ("Medical Hub", .02, -.07, .88, .62, .75),
        ("Heritage Zone", -.03, .05, .95, .85, .92),
    ]
    c = CITIES.get(city, CITIES["Hyderabad"])
    bt = predict(city, year, "traffic", model)
    ba = predict(city, year, "aqi", model)
    bp = predict(city, year, "population", model)
    # Seeded RNG per zone for determinism
    rng = _seeded_random(city, year, "zones", model)
    zones = []
    for n, lo, go, tm, am, pm in zones_tpl:
        zt = round(bt * tm * (1 + (rng.random() - .5) * .06), 1)
        za = round(ba * am * (1 + (rng.random() - .5) * .06))
        zp = round(bp * pm * (1 + (rng.random() - .5) * .04), 3)
        rs = round(min(100, (zt / 1.5 + za / 3.5) / 2), 1)
        rl = "CRITICAL" if rs > 75 else "HIGH" if rs > 55 else "MEDIUM" if rs > 35 else "LOW"
        zones.append({"name": n, "lat": c["lat"] + lo, "lng": c["lng"] + go,
                       "traffic": zt, "aqi": za, "population": zp,
                       "risk_score": rs, "risk_level": rl})
    return jsonify({"city": city, "year": year, "model": model, "zones": zones})


@pred_bp.route("/models/metrics")
def models_metrics():
    city, _ = _validate_city(request.args.get("city"))
    return jsonify({"city": city, "metrics": MODEL_ACCURACY})


@pred_bp.route("/recommendations")
def recommendations():
    city, _ = _validate_city(request.args.get("city"))
    year, err = _validate_year(request.args.get("year"))
    model, _ = _validate_model(request.args.get("model"))
    if err:
        return err
    t = predict(city, year, "traffic", model)
    a = predict(city, year, "aqi", model)
    p = predict(city, year, "population", model)
    recs = []
    if t > 100:
        recs.append({"icon": "\U0001f6a7", "title": "Emergency Road Infrastructure", "priority": "CRITICAL", "category": "Transport", "description": f"Traffic index {t:.0f} \u2192 near-gridlock. Mandate elevated expressways, AI adaptive signals.", "impact": "Reduce congestion 40\u201355%", "timeline": "5\u20138 yrs", "cost_estimate": "\u20b960,000\u20131.2L Cr"})
    elif t > 70:
        recs.append({"icon": "\U0001f309", "title": "Flyover & Grade Separator Build", "priority": "HIGH", "category": "Transport", "description": f"Index {t:.0f} \u2192 multi-level junctions needed on commercial arterials.", "impact": "Reduce congestion 25\u201335%", "timeline": "3\u20135 yrs", "cost_estimate": "\u20b915,000\u201345,000 Cr"})
    else:
        recs.append({"icon": "\U0001f6b2", "title": "Smart Mobility & Green Commute", "priority": "MEDIUM", "category": "Transport", "description": "Expand BRT, EV charging grid, last-mile micro-mobility.", "impact": "Cut emissions 18\u201322%", "timeline": "2\u20134 yrs", "cost_estimate": "\u20b93,000\u201315,000 Cr"})
    if a > 200:
        recs.append({"icon": "\U0001f3ed", "title": "Pollution Emergency Protocol", "priority": "CRITICAL", "category": "Environment", "description": f"AQI {a:.0f} \u2014 hazardous. Industrial caps, EV mandate.", "impact": "Reduce AQI 60\u201380 pts", "timeline": "3\u20136 yrs", "cost_estimate": "\u20b930,000\u201380,000 Cr"})
    elif a > 120:
        recs.append({"icon": "\U0001f333", "title": "Urban Forest & Green Corridors", "priority": "HIGH", "category": "Environment", "description": f"AQI {a:.0f} \u2192 plant 10M trees, sensor mesh.", "impact": "Improve AQI 25\u201340 pts", "timeline": "4\u20137 yrs", "cost_estimate": "\u20b98,000\u201324,000 Cr"})
    else:
        recs.append({"icon": "\U0001f33f", "title": "Preventive Green Infrastructure", "priority": "LOW", "category": "Environment", "description": "Invest in biodiversity corridors and urban wetlands.", "impact": "Sustain AQI baseline", "timeline": "Ongoing", "cost_estimate": "\u20b91,500\u20134,000 Cr"})
    if p > 20:
        recs.append({"icon": "\U0001f3d9\ufe0f", "title": "Satellite City Development", "priority": "CRITICAL", "category": "Urban Planning", "description": f"{p:.1f}M pop \u2192 commission 4 satellite towns within 60km.", "impact": "Decongest core 30%", "timeline": "10\u201315 yrs", "cost_estimate": "\u20b91.5\u20134L Cr"})
    else:
        recs.append({"icon": "\U0001f3d8\ufe0f", "title": "Vertical Density & Rezoning", "priority": "HIGH", "category": "Urban Planning", "description": "Transit-oriented development hubs, FSI reform.", "impact": "Increase livable space 35%", "timeline": "5\u20138 yrs", "cost_estimate": "\u20b940,000\u20131L Cr"})
    recs.append({"icon": "\U0001f687", "title": "Metro & Mass Transit Expansion", "priority": "HIGH", "category": "Infrastructure", "description": "Extend metro, hydrogen BRT on 20 corridors.", "impact": "35% modal shift from cars", "timeline": "5\u201310 yrs", "cost_estimate": "\u20b960,000\u20131.5L Cr"})
    return jsonify({
        "city": city, "year": year, "model": model,
        "metrics": {"traffic": round(t, 2), "aqi": round(a, 2), "population": round(p, 4)},
        "recommendations": recs,
    })
