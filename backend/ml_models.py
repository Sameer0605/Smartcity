"""
ml_models.py  |  SmartCity AI — Scikit-learn ML Models (Optional Advanced Backend)
====================================================================================
This file shows how to upgrade server.py with real trained scikit-learn models.

Usage:
  1. pip install numpy scikit-learn pandas
  2. Run: python ml_models.py   ← trains + saves models
  3. In server.py, import: from ml_models import predict_sklearn
  4. Replace predict() calls with predict_sklearn()

Models trained:
  • Ridge Regression     (Linear Reg mode)
  • Random Forest        (RF mode)
  • Gradient Boosting    (LSTM-approximation mode)
"""

import numpy as np
import pickle
import os

CITIES = {
    "Mumbai":    {"p0":18.4,"t0":68,"a0":148,"pr":.38,"tr":.31,"ar":.72},
    "Delhi":     {"p0":28.5,"t0":82,"a0":198,"pr":.45,"tr":.40,"ar":1.05},
    "Bangalore": {"p0":8.4, "t0":58,"a0":62, "pr":.52,"tr":.35,"ar":.42},
    "Hyderabad": {"p0":7.7, "t0":62,"a0":75, "pr":.42,"tr":.33,"ar":.55},
    "Chennai":   {"p0":7.1, "t0":55,"a0":78, "pr":.35,"tr":.28,"ar":.48},
}

def generate_training_data():
    """Generate synthetic training data from known city growth patterns."""
    X, y_traffic, y_aqi, y_pop = [], [], [], []
    for city_name, c in CITIES.items():
        for year in range(2000, 2025):
            t = year - 2000
            # Features: [t, t^2, base_traffic, base_aqi, base_pop, growth_rates]
            feat = [t, t**2, c["t0"], c["a0"], c["p0"], c["tr"], c["ar"], c["pr"]]
            X.append(feat)
            y_traffic.append(c["t0"] + c["tr"]*t + 0.002*t**2)
            y_aqi.append(c["a0"] + c["ar"]*t + 0.003*t**2)
            y_pop.append(c["p0"] + c["pr"]*t + 0.001*t**2)
    return np.array(X), np.array(y_traffic), np.array(y_aqi), np.array(y_pop)


def train_and_save():
    """Train all 3 model types and save to disk."""
    try:
        from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
        from sklearn.linear_model import Ridge
        from sklearn.preprocessing import StandardScaler
        import pickle
    except ImportError:
        print("Run: pip install scikit-learn numpy")
        return

    X, yt, ya, yp = generate_training_data()

    models = {
        "LR":   Ridge(alpha=1.0),
        "RF":   RandomForestRegressor(n_estimators=100, random_state=42),
        "LSTM": GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, random_state=42),
    }

    trained = {}
    for mname, model in models.items():
        model_traffic = type(model)(**model.get_params())
        model_aqi     = type(model)(**model.get_params())
        model_pop     = type(model)(**model.get_params())
        model_traffic.fit(X, yt)
        model_aqi.fit(X, ya)
        model_pop.fit(X, yp)
        trained[mname] = {"traffic": model_traffic, "aqi": model_aqi, "population": model_pop}
        print(f"  ✓ {mname} trained")

    os.makedirs("models", exist_ok=True)
    with open("models/trained_models.pkl","wb") as f:
        pickle.dump(trained, f)
    print("✓ Models saved to models/trained_models.pkl")


def predict_sklearn(city, year, feature, model_name="LSTM"):
    """
    Predict using trained sklearn models.
    Falls back to formula-based prediction if models not found.
    """
    try:
        with open("models/trained_models.pkl","rb") as f:
            models = pickle.load(f)
        c = CITIES.get(city, list(CITIES.values())[0])
        t = year - 2000
        feat = np.array([[t, t**2, c["t0"], c["a0"], c["p0"], c["tr"], c["ar"], c["pr"]]])
        model = models[model_name][feature]
        return float(model.predict(feat)[0])
    except Exception:
        # Fallback to formula
        import math
        c = CITIES.get(city, {"t0":60,"a0":80,"p0":5,"tr":.3,"ar":.5,"pr":.4})
        t = year - 2000
        base, rate = {"traffic":(c["t0"],c["tr"]),"aqi":(c["a0"],c["ar"]),"population":(c["p0"],c["pr"])}.get(feature,(50,.3))
        return max(0, base + rate*t + 0.002*t**2)


if __name__ == "__main__":
    print("Training SmartCity AI models...")
    train_and_save()
    print("\nTest prediction for Mumbai 2050 (LSTM):")
    print(f"  Traffic:    {predict_sklearn('Mumbai',2050,'traffic','LSTM'):.1f}")
    print(f"  AQI:        {predict_sklearn('Mumbai',2050,'aqi','LSTM'):.0f}")
    print(f"  Population: {predict_sklearn('Mumbai',2050,'population','LSTM'):.2f}M")
