from uuid import uuid4

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from catalog import STUDY_CASES
from config import ALLOWED_ORIGINS, GERMANY_SOURCE_DIR
from services.rasters import missing_rasters, raster_inventory
from services.scenarios import ScenarioValidationError, recommended_interaction, validate_scenario
from services.shi import RasterCalculationError, calculate_shi_overlay
from config import GERMANY_RESULT_DIR

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def api_index():
    return jsonify({
        "application": "Germany Multi-Hazard DSS API",
        "status": "running",
        "phase": 2,
        "endpoints": {
            "health": "/api/health",
            "study_cases": "/api/study-cases",
            "germany": "/api/study-cases/germany",
            "calculate_raw_shi": "POST /api/mhi/calculate",
        },
    })


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "phase": 2})


@app.get("/api/study-cases")
def list_study_cases():
    return jsonify([{key: value for key, value in case.items() if key != "hazards"} for case in STUDY_CASES.values()])


@app.get("/api/study-cases/<case_id>")
def get_study_case(case_id):
    case = STUDY_CASES.get(case_id)
    if case is None:
        return jsonify({"error": "Study case not found."}), 404
    result = dict(case)
    result["hazards"] = raster_inventory(case, GERMANY_SOURCE_DIR)
    return jsonify(result)


@app.get("/api/interactions/recommendation")
def interaction_recommendation():
    source = request.args.get("source", "")
    target = request.args.get("target", "")
    level = recommended_interaction(source, target)
    return jsonify({"source": source, "target": target, "level": level, "provisional": True})


@app.get("/api/results/<path:filename>")
def result_file(filename):
    return send_from_directory(GERMANY_RESULT_DIR, filename)


@app.post("/api/mhi/calculate")
def calculate_mhi():
    payload = request.get_json(silent=True) or {}
    case_id = payload.get("study_case")
    case = STUDY_CASES.get(case_id)
    if case is None:
        return jsonify({"error": "Study case not found."}), 404

    try:
        scenario = validate_scenario(payload.get("scenario", {}), {item["id"] for item in case["hazards"]})
    except ScenarioValidationError as exc:
        return jsonify({"error": str(exc)}), 400

    inventory = raster_inventory(case, GERMANY_SOURCE_DIR)
    selected = {item["id"] for item in scenario["hazards"]}
    missing = missing_rasters(selected, inventory)
    if missing:
        return jsonify({
            "error": "Required Germany rasters are missing.",
            "missing_files": missing,
            "data_directory": str(GERMANY_SOURCE_DIR),
        }), 422

    files_by_id = {
        item["id"]: GERMANY_SOURCE_DIR / item["filename"]
        for item in inventory if item["id"] in selected
    }
    result_name = f"shi-{uuid4().hex}.png"
    try:
        calculation = calculate_shi_overlay(scenario, files_by_id, GERMANY_RESULT_DIR / result_name)
    except RasterCalculationError as exc:
        return jsonify({"error": str(exc)}), 422
    return jsonify({
        "status": "completed",
        "index": "SHI",
        "formula": "sum(H_i * N_i * I_i)",
        "calculation": calculation,
        "overlay_url": f"/api/results/{result_name}",
        "warning": "Classes 1-9 currently use equal intervals of the theoretical maximum; official thresholds are still required.",
    })


if __name__ == "__main__":
    GERMANY_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    app.run(host="127.0.0.1", port=5000, debug=True)
