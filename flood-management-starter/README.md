# Smart Flood Monitoring and Early Warning System

Final-year / production-style full stack: **React + Leaflet** dashboard, **Node.js + Express + MongoDB** orchestration, and **Python FastAPI** flood-risk models (Random Forest + XGBoost), with optional LSTM rainfall head. **No Web3, blockchain, or MetaMask** — conventional cloud-friendly services only.

## 1. Project structure

```
flood-management-starter/
├── frontend/                 # Parcel + React + Leaflet (+ heatmap + charts)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/client.js
│   │   ├── config/map.js
│   │   ├── utils/risk.js, session.js
│   │   ├── components/RiskCharts.jsx
│   │   ├── components/project/   # problem statement, future scope, system modal
│   │   ├── config.js
│   │   └── firebaseNotifications.js   # optional FCM stub
│   ├── .env.example
│   └── package.json
├── backend/                  # Node API (MongoDB, live data, safe routing, ML proxy)
│   ├── src/
│   │   ├── server.js
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── seed.js
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── .env.example
│   └── package.json
├── ml-model/                 # FastAPI + training + sample dataset
│   ├── app/                  # FastAPI application
│   ├── scripts/              # train_models.py, train_lstm.py (optional)
│   ├── data/sample_flood_training.csv
│   ├── models/               # joblib artifacts (generated)
│   ├── requirements.txt
│   ├── requirements-lstm.txt
│   └── .env.example
└── README.md
```

Legacy `ml_api/` (older venv) can be ignored in favour of `ml-model/`.

## 2. Prerequisites

- **Node.js 18+**
- **Python 3.11 or 3.12 (64-bit)** from [python.org](https://www.python.org/downloads/)  
  Very new interpreters (for example **3.14**) may not yet ship wheels for `scikit-learn` / `xgboost`; if `pip install` tries to compile from source, switch to **3.12 x64**.
- **MongoDB** — [Community Server](https://www.mongodb.com/try/download/community) locally (default `mongodb://127.0.0.1:27017`) or [Atlas](https://www.mongodb.com/atlas) in the cloud.

## 3. Environment variables

### `ml-model/.env` (copy from `.env.example`)

- `ML_HOST`, `ML_PORT` — bind address for FastAPI (default `0.0.0.0:8000`).
- `DEFAULT_MODEL` — `random_forest` or `xgboost` when the client does not specify a model.
- `MODEL_DIR` — folder containing trained `.joblib` files.

### `backend/.env` (copy from `.env.example`)

- `PORT` — default `4000`.
- `MONGODB_URI` — e.g. `mongodb://127.0.0.1:27017/flood_monitor`.
- `ML_SERVICE_URL` — e.g. `http://127.0.0.1:8000` (FastAPI root, no trailing slash required).
- `CORS_ORIGIN` — e.g. `http://localhost:3000` or `*` for development.

### `frontend/.env` (copy from `.env.example`)

- `API_BASE` — e.g. `http://localhost:4000/api` (Parcel inlines `process.env.API_BASE`).

## 4. Install and run (full stack)

### Step A — MongoDB (local)

Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) for Windows and start the **MongoDB** service (the installer usually enables it). Ensure it listens on **`127.0.0.1:27017`** (default). Set `MONGODB_URI` in `backend/.env` if yours differs.

### Step B — ML service (`ml-model`)

```powershell
cd ml-model
python -m venv .venv
.\.venv\Scripts\activate
pip install -U pip
pip install -r requirements.txt
python scripts\train_models.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use **`python -m uvicorn`** (not bare `uvicorn`) so the active venv’s Python is used. If **`pydantic-core` fails to build** on **Python 3.14**, upgrade pip as above; this repo’s `requirements.txt` uses **Pydantic ≥2.12** so a **prebuilt** `pydantic-core` wheel for 3.14 can install. As a fallback, use **Python 3.12 x64**.

Endpoints (FastAPI):

- `GET /health`
- `POST /predict-risk` — JSON body: `rainfall`, `elevation`, `distance_to_river`, `soil_type`, optional `model`.
- `POST /predict-rainfall-lstm` — optional; requires `pip install -r requirements-lstm.txt` and `python scripts\train_lstm.py`.

### Step C — Node backend

```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```

Main HTTP routes (all prefixed `/api`):

- `GET /api/health`
- `GET /api/system` — JSON metadata for reports / viva (stack, capabilities, `blockchain: false`).
- `GET /api/live-data` — simulated rainfall / water level persisted on zones.
- `GET /api/dashboard` — zones + live readings + alert summary.
- `GET /api/zones`
- `POST /api/zones/recompute` — calls ML service per zone, writes `Prediction` history.
- `POST /api/safe-route` — body `{ startLat, startLng, endLat, endLng }` (weighted grid A* avoiding DANGER cells).
- `POST /api/user-location` — stores anonymized browser locations.
- `GET /api/predictions/recent?limit=50`

### Step D — Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run start
```

Open `http://localhost:3000`. The UI polls **`/api/dashboard`** (which runs the **live rainfall / water-level simulator** and returns zones), supports **Recompute risk (ML)** via **`POST /api/zones/recompute`**, **safe route** vs **OSRM** comparison, **heatmap**, **DANGER** banner + optional **browser notifications**, and **analytics** charts. The sidebar includes **Problem statement**, **Future scope** (explicitly **no blockchain**), and a **System overview** modal fed by **`GET /api/system`**.

## 5. Optional bonuses

- **LSTM**: install TensorFlow extras, train `scripts/train_lstm.py`, restart FastAPI.
- **Firebase push**: install `firebase`, expose `window.__FIREBASE_CONFIG__`, call `initializeFirebaseMessaging()` from `src/firebaseNotifications.js` after a click handler.

## 6. Production notes

- Put **TLS** reverse proxy (nginx, Caddy, cloud LB) in front of Node + FastAPI.
- Lock down **CORS** to your real web origin.
- Replace simulated live data with **hydrology / weather APIs** and persist authoritative telemetry.
- Snap `safe-route` polylines to **OSRM / Valhalla** graphs for road-faithful evacuation (current grid path is research-grade).
