"""
Locust Outbreak Predictor — FastAPI backend
Serves a trained Logistic Regression pipeline (StandardScaler + LogisticRegression)
that predicts desert-locust swarm risk from environmental features
(soil moisture, precipitation, max temp).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd

app = FastAPI(
    title="Locust Outbreak Predictor",
    description="Predicts desert-locust swarm risk from environmental conditions.",
    version="1.0.0",
)

# CORS — lets your frontend (served from a different origin) call this API.
# For a portfolio demo we allow all origins; tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained model once at startup (not per-request).
model = joblib.load("model.pkl")
FEATURES = ["soil_moisture", "precipitation", "max_temp"]


class PredictionRequest(BaseModel):
    soil_moisture: float = Field(..., ge=0, le=1000,
        description="Soil moisture in mm (TerraClimate scale, ~0-300)")
    precipitation: float = Field(..., ge=0, le=2000,
        description="Monthly precipitation in mm")
    max_temp: float = Field(..., ge=-20, le=60,
        description="Max temperature in °C")

    model_config = {
        "json_schema_extra": {
            "example": {"soil_moisture": 35.0, "precipitation": 84.0, "max_temp": 28.0}
        }
    }


@app.get("/")
def home():
    return {
        "status": "running",
        "service": "Locust Outbreak Predictor",
        "usage": "POST /predict with soil_moisture, precipitation, max_temp",
    }


@app.post("/predict")
def predict(req: PredictionRequest):
    # Build a single-row DataFrame with correct column names
    X = pd.DataFrame([[req.soil_moisture, req.precipitation, req.max_temp]],
                     columns=FEATURES)
    prob = float(model.predict_proba(X)[0][1])

    if prob >= 0.66:
        risk = "HIGH"
    elif prob >= 0.4:
        risk = "MODERATE"
    else:
        risk = "LOW"

    return {
        "outbreak_probability": round(prob, 3),
        "risk_level": risk,
        "inputs": req.model_dump(),
    }
