# Germany Multi-Hazard DSS

MVP for the public workflow:

1. Public Access
2. Select Germany
3. Configure a hazard scenario
4. Calculate the raw Sinkhole Hazard Index (SHI)
5. Classify it from 1 to 9 after scientific thresholds are supplied

The application is deliberately split into two independent folders:

- `backend/`: Python/Flask API and GIS processing
- `frontend/`: static HTML, CSS and JavaScript client

## Current phase

Phase 1 provides navigation and scenario configuration. Phase 2 implements the supplied raw formula `SHI = sum(H_i * N_i * I_i)` for five confirmed inputs. The 1-9 classification thresholds are still required.

The five Germany inputs are Closure of Mining Work, Type of Mining, Presence
of an Aquifer in Overburden, Shallow Coal Seam, and Geology of the Overburden.

## Run locally

Install Python 3.11+ and then run:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

In a second terminal:

```powershell
cd frontend
python -m http.server 5500
```

Open `http://localhost:5500`. The API runs at `http://localhost:5000`.

## GIS data

Place source GeoTIFF files in `backend/data/germany/source/`. Do not commit confidential or large rasters. See `backend/data/README.md` for naming and validation requirements.
