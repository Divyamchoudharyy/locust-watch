# Locust Watch — Frontend

React + Vite + Leaflet app. Click anywhere on the locust belt to get a
live swarm-risk prediction from the FastAPI model, or fine-tune conditions
with the sliders.

## How the map works
- `public/grid.json` holds ~4,300 environmental data points (soil moisture,
  precipitation, max temp) extracted from TerraClimate across the locust belt.
- Click the map → app finds the nearest grid cell → sends its real values to
  the API → shows the live prediction. The model runs on every click.

## Run locally
The backend must be running first (see locust-api):
    uvicorn main:app --reload    # http://127.0.0.1:8000

Then here:
    npm install
    npm run dev                  # open the localhost:5173 URL it prints

## Connect to a deployed API
In src/App.jsx change:
    const API_URL = "http://127.0.0.1:8000"
to your Render URL, then rebuild.

## Deploy free
    npm run build                # outputs to dist/
Drag dist/ onto netlify.com/drop, or use GitHub Pages.

## Files
- src/App.jsx   — map + sliders + gauge + live fetch
- src/App.css   — styling (arid-terrain palette)
- public/grid.json — environmental grid shipped with the app
