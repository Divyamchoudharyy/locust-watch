# 🦗 Locust Watch — Desert Locust Outbreak Risk Predictor

An end-to-end machine learning system that predicts desert-locust swarm risk
from environmental conditions, served through a live interactive map.
Built from a custom dataset fusing **FAO Locust Hub** swarm records with
**TerraClimate** environmental data.

**Live demo:** [locust-watch.netlify.app](https://locust-watch.netlify.app/)
**Stack:** Python · scikit-learn · FastAPI · React · Leaflet · TerraClimate · Google Earth Engine

---

## What it does

Desert locust swarms threaten food security across Africa, the Middle East,
and South Asia — the 2020 upsurge damaged crops from Kenya to India. This tool
estimates the swarm-risk of any location in the locust belt from its
environmental conditions, and explains *why* it gave that score.

- **Click any point** on the map → see live swarm-risk (green / orange / red)
- **Adjust conditions** (soil moisture, rainfall, temperature) to explore "what-if" scenarios
- **See the reasoning** — each prediction shows which factors drove it
- **Honest about uncertainty** — this is a decision-support indicator, not a guarantee

---

## How it works

```
FAO swarm records  ─┐
                     ├─►  Custom labeled dataset  ─►  Model  ─►  FastAPI  ─►  React + Leaflet map
TerraClimate data  ─┘     (presence + pseudo-absence)
```

1. **Presence data** — ~2,500 confirmed 2020 swarm coordinates from the FAO Locust Hub.
2. **Pseudo-absences** — non-swarm points generated with *constrained spatial
   sampling* (perturbing real swarm locations within the same climate zone and
   season), so the model learns environmental signal rather than "is this a desert."
3. **Features** — soil moisture, precipitation, and max temperature, extracted
   per-point from TerraClimate NetCDF grids using `xarray`.
4. **Model** — Logistic Regression (chosen over Random Forest; see below).
5. **Serving** — FastAPI exposes `/predict`; a React + Leaflet frontend ships a
   ~4,300-cell environmental grid so any map click yields a live prediction.

---

## Results & the honest evaluation story

The headline isn't the accuracy number — it's *how the model was validated*.

| Evaluation | ROC-AUC | What it tells us |
|---|---|---|
| Random train/test split | 0.84 | **Inflated** — spatial leakage |
| Spatial split (train Africa/Arabia, test South Asia) | **0.76** | The honest, real-world number |

**Why the spatial split matters:** nearby geographic points have nearly
identical weather. A random split lets the model "see" the test region during
training (spatial leakage), inflating scores. Holding out an entire unseen
region (South Asia) is the honest test of whether the model generalizes — and
it dropped the score from 0.84 to 0.76, revealing the true performance.

At the chosen operating point the model catches **~79% of real swarms**
(recall) — the metric that matters most for an early-warning system, where a
missed swarm is far costlier than a false alarm.

**Why Logistic Regression over Random Forest:** under the honest spatial test,
the simpler linear model generalized better (0.76 vs a regularized RF's 0.70).
A deep RF overfit to region-specific patterns (collapsing to 0.51 cross-region).
Model simplicity won under distribution shift.

---

## What I tried that *didn't* work (and why that's useful)

Rigorous negative results, documented honestly:

- **Expanding to 4 years (2015, 2019–2021, ~53k points)** *lowered* cross-region
  AUC to 0.53. Investigation showed most multi-year swarm records are *migrating
  adults* photographed in transit — locations with no special environmental
  signature — so the classes became inseparable. **Lesson: more data ≠ better
  model when label quality drops.**
- **Adding NDVI (satellite vegetation) via Google Earth Engine** barely moved the
  multi-year score (0.53 → 0.54). Vegetation at swarm sites was statistically
  identical to non-swarm sites. **Lesson: feature engineering can't fix a label-
  quality problem.** The bottleneck was noisy labels, not missing features.

These experiments confirmed the single-year (2020) model — trained on a cleaner
slice where swarms reflect actual breeding conditions — is the strongest, and
they demonstrate spatial leakage, the limits of "more data," and the primacy of
label quality.

---

## Known limitations

- **Indicator, not oracle.** 0.76 AUC is useful guidance, not a guarantee.
- **Snapshot, not forecast.** The model scores current conditions; it does not
  forecast future weather. The "what-if" sliders let users explore hypothetical
  conditions — they are not a time-based forecast.
- **2020 training window.** Strongest on conditions resembling the 2020 upsurge.
- **Three environmental features.** A production system would add temporal lag
  features (rainfall 1–2 months prior, capturing breeding cycles) and cleaner,
  breeding-specific swarm labels.

---

## Deployment

The app is split into two independently deployed services:

- **Backend (FastAPI)** → Render
  - Root directory: `locust-api`
  - Build: `pip install -r requirements.txt`
  - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Frontend (React + Vite)** → Netlify
  - Base directory: `locust-frontend`
  - Build: `npm run build` · Publish: `locust-frontend/dist`
  - Set `API_URL` in `src/App.jsx` to the deployed backend URL before building.

> **Note:** the backend runs on a free tier that sleeps after inactivity, so the
> first request after an idle period may take ~30–50 seconds to wake. Subsequent
> requests are fast.

## Project structure

```
locust-project/
├── locust-api/        FastAPI backend + trained model
│   ├── main.py        /predict endpoint with feature attribution
│   └── model.pkl      Logistic Regression (2020, spatial-validated)
└── locust-frontend/   React + Vite + Leaflet
    ├── src/App.jsx    map, sliders, risk gauge, "why" breakdown
    └── public/grid.json  ~4,300-cell environmental grid
```

## Running locally

```bash
# Backend
cd locust-api
pip install -r requirements.txt
uvicorn main:app --reload         # http://127.0.0.1:8000

# Frontend (separate terminal)
cd locust-frontend
npm install
npm run dev                       # http://localhost:5173
```

## Data sources & credit

- **FAO Locust Hub** — desert locust swarm observations
- **TerraClimate** (Climatology Lab) — monthly climate data
- **MODIS / Google Earth Engine** — NDVI vegetation (experimental)

Built as a learning project to demonstrate end-to-end ML engineering:
custom dataset construction, honest spatial validation, model serving, and
a full-stack interactive interface.
