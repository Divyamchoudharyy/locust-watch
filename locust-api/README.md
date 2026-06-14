# Locust Outbreak Predictor — API

FastAPI backend serving a Logistic Regression model that predicts
desert-locust swarm risk from environmental conditions.

## Run locally

```bash
# 1. (optional) create a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 2. install dependencies
pip install -r requirements.txt

# 3. run the server
uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000/docs** — FastAPI's auto-generated
interactive API docs. You can test the /predict endpoint right there.

## Endpoints

- `GET /` — health check
- `POST /predict` — body: `{"soil_moisture": 35.0, "precipitation": 84.0, "max_temp": 28.0}`
  returns: `{"outbreak_probability": 0.527, "risk_level": "MODERATE", ...}`

## Deploy free on Render

1. Push this folder to a GitHub repo.
2. Go to render.com → New → Web Service → connect the repo.
3. Settings:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Deploy. Render gives you a public URL like `https://locust-api.onrender.com`.

> Free tier sleeps after inactivity; first request after idle takes ~30s to wake.
