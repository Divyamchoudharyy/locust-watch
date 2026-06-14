import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMapEvents, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

// After deploying the backend to Render, replace with your live URL.
const API_URL = "https://locust-watch.onrender.com"

const FIELDS = [
  { key: "soil_moisture", label: "Soil moisture", unit: "mm", min: 0, max: 256, step: 1 },
  { key: "precipitation", label: "Precipitation", unit: "mm/mo", min: 0, max: 400, step: 1 },
  { key: "max_temp",      label: "Max temperature", unit: "°C", min: 0, max: 50, step: 0.5 },
]

const RISK = {
  HIGH:     { color: "var(--high)", bg: "var(--high-bg)", note: "Conditions strongly favor swarm formation. In a real system this would trigger field surveillance." },
  MODERATE: { color: "var(--mod)",  bg: "var(--mod-bg)",  note: "Some breeding conditions present. Worth monitoring." },
  LOW:      { color: "var(--low)",  bg: "var(--low-bg)",  note: "Conditions are unfavorable for swarm formation." },
}
const riskHex = (p) => p >= 0.66 ? "#B91C1C" : p >= 0.4 ? "#B45309" : "#15803D"

const REGIONS = [
  { name: "Rajasthan, India", lat:[25,30], lon:[69,76] }, { name: "Gujarat, India", lat:[20,24.5], lon:[68,74] },
  { name: "Sindh, Pakistan", lat:[24,28], lon:[66,71] },  { name: "Balochistan, Pakistan", lat:[25,32], lon:[60,70] },
  { name: "Kenya", lat:[-5,5], lon:[34,42] }, { name: "Ethiopia", lat:[3.5,15], lon:[33,48] },
  { name: "Somalia", lat:[-1.5,11], lon:[41,51] }, { name: "Yemen", lat:[12,19], lon:[42,53] },
  { name: "Oman", lat:[16,26], lon:[52,60] }, { name: "Saudi Arabia", lat:[16,32], lon:[36,55] },
  { name: "Sudan", lat:[9,22], lon:[22,39] }, { name: "Egypt / Red Sea", lat:[22,31], lon:[25,37] },
  { name: "Iran", lat:[25,34], lon:[54,63] }, { name: "Eritrea", lat:[12,18], lon:[36,43] },
]
const regionName = (lat, lon) => {
  for (const r of REGIONS) if (lat>=r.lat[0]&&lat<=r.lat[1]&&lon>=r.lon[0]&&lon<=r.lon[1]) return r.name
  return null
}
function nearestCell(grid, lat, lon) {
  let best=null, bd=Infinity
  for (const c of grid) { const d=(c.lat-lat)**2+(c.lon-lon)**2; if(d<bd){bd=d;best=c} }
  return best
}
function ClickCatcher({ onPick }) {
  useMapEvents({ click(e){ onPick(e.latlng.lat, e.latlng.lng) } })
  return null
}

export default function App() {
  const [grid, setGrid] = useState([])
  const [values, setValues] = useState({ soil_moisture:35, precipitation:84, max_temp:28 })
  const [actualValues, setActualValues] = useState(null)
  const [selected, setSelected] = useState(null)
  const [adjusted, setAdjusted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch("grid.json").then(r=>r.json()).then(setGrid)
      .catch(()=>setError("Couldn't load the environmental grid."))
  }, [])

  const update = (k,v) => { setValues(p=>({...p,[k]:parseFloat(v)})); setAdjusted(true) }

  const predict = async (vals=values) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(vals),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setResult(await res.json())
    } catch(e) {
      setError(e.message.includes("fetch") ? "Can't reach the prediction server. Is the API running?" : e.message)
      setResult(null)
    } finally { setLoading(false) }
  }

  const handlePick = (lat, lon) => {
    if (!grid.length) return
    setSelected({ lat, lon, name: regionName(lat,lon) })
    setResult(null); setAdjusted(false)
    setTimeout(() => {
      const cell = nearestCell(grid, lat, lon)
      if (!cell) return
      const vals = { soil_moisture:cell.sm, precipitation:cell.p, max_temp:cell.t }
      setValues(vals); setActualValues(vals)
      setSelected({ lat:cell.lat, lon:cell.lon, name:regionName(cell.lat,cell.lon) })
      predict(vals)
    }, 0)
  }

  const resetToActual = () => {
    if (!actualValues) return
    setValues(actualValues); setAdjusted(false); predict(actualValues)
  }

  const prob = result ? result.outbreak_probability : null
  const rk = result ? RISK[result.risk_level] : null

  return (
    <div className="app">
      <header className="head">
        <div className="brand">
          <span className="dot" /> Locust Watch
        </div>
        <div className="head-meta">Desert locust outbreak risk · 2020 model</div>
      </header>

      <main className="main">
        <section className="intro">
          <h1>Where might locusts swarm?</h1>
          <p>Click any point on the locust belt to estimate swarm risk from local soil,
             rainfall, and temperature — then adjust the conditions to explore what changes.</p>
        </section>

        <div className="layout">
          {/* MAP — the hero */}
          <div className="map-col">
            <MapContainer center={[18,50]} zoom={3} className="map" scrollWheelZoom={true}>
              <TileLayer attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickCatcher onPick={handlePick} />
              {selected && (
                <CircleMarker center={[selected.lat, selected.lon]} radius={9} className="pulse-marker"
                  pathOptions={{ color:"#1C1917", weight:2,
                    fillColor: result ? riskHex(prob) : "#A8A29E", fillOpacity:0.9 }}>
                  <Tooltip permanent direction="top" offset={[0,-8]}>
                    {result ? `${Math.round(prob*100)}%` : "…"}
                  </Tooltip>
                </CircleMarker>
              )}
            </MapContainer>
            <p className="map-hint">
              {selected ? "Click another location to compare." : "Click any point on land to begin."}
            </p>
          </div>

          {/* RESULT */}
          <div className="result-col">
            {result ? (
              <>
                <div className="loc-bar">
                  <div>
                    <div className="loc-name">{selected?.name || "Selected location"}</div>
                    <div className="loc-coords">{selected?.lat.toFixed(2)}°, {selected?.lon.toFixed(2)}°</div>
                  </div>
                  <span className="mode-tag" style={{ color: adjusted ? "var(--mod)" : "var(--ink-faint)" }}>
                    {adjusted ? "adjusted" : "actual"}
                  </span>
                </div>

                <div className="risk-readout" style={{ background: rk.bg }}>
                  <div className="risk-pct" style={{ color: rk.color }}>
                    {Math.round(prob*100)}<span>%</span>
                  </div>
                  <div className="risk-meta">
                    <div className="risk-level" style={{ color: rk.color }}>{result.risk_level} RISK</div>
                    <div className="risk-sub">swarm probability</div>
                  </div>
                </div>

                <p className="risk-note">{rk.note}</p>

                {result.drivers && (
                  <div className="drivers">
                    <div className="drivers-head">What's driving this</div>
                    {result.drivers.map(d => (
                      <div className="driver" key={d.feature}>
                        <div className="driver-top">
                          <span>{d.feature}</span>
                          <span style={{ color: d.direction==="raises" ? "var(--high)" : "var(--low)" }}>
                            {d.direction==="raises" ? "↑" : "↓"} {Math.round(d.share*100)}%
                          </span>
                        </div>
                        <div className="track">
                          <div className="fill" style={{ width:`${d.share*100}%`,
                            background: d.direction==="raises" ? "var(--high)" : "var(--low)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : loading ? (
              <div className="placeholder">
                {selected && <div className="loc-name">{selected.name || "Selected location"}</div>}
                <div className="spinner" />
                <p>Reading conditions…</p>
              </div>
            ) : (
              <div className="placeholder">
                <p className="placeholder-big">No location selected</p>
                <p>Click the map to see a swarm-risk estimate.</p>
              </div>
            )}
          </div>
        </div>

        {/* CONDITIONS */}
        <div className="conditions">
          <div className="cond-head">
            <span>{adjusted ? "Adjusted conditions" : "Conditions"}</span>
            {adjusted && actualValues && <button className="reset" onClick={resetToActual}>Reset to actual</button>}
          </div>
          <div className="sliders">
            {FIELDS.map(f => (
              <div className="slider" key={f.key}>
                <div className="slider-top">
                  <label htmlFor={f.key}>{f.label}</label>
                  <span className="val">{values[f.key]}<i>{f.unit}</i></span>
                </div>
                <input id={f.key} type="range" min={f.min} max={f.max} step={f.step}
                  value={values[f.key]} onChange={e=>update(f.key, e.target.value)} />
              </div>
            ))}
          </div>
          <button className="assess" onClick={()=>predict()} disabled={loading}>
            {loading ? "Reading…" : adjusted ? "Re-assess with these values" : "Assess swarm risk"}
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </main>

      <footer className="foot">
        <span>Logistic Regression · ROC-AUC 0.76 (cross-region honest test)</span>
        <span>FAO Locust Hub + TerraClimate · {grid.length.toLocaleString()} grid cells</span>
      </footer>
    </div>
  )
}