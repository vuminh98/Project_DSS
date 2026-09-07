from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
GERMANY_SOURCE_DIR = DATA_DIR / "germany" / "source"
GERMANY_RESULT_DIR = DATA_DIR / "germany" / "results"

# Development origins: allow any local frontend port (Live Server, Vite, etc.).
# Keep this list strict in production.
ALLOWED_ORIGINS = [
    r"http://localhost(:[0-9]+)?",
    r"http://127\.0\.0\.1(:[0-9]+)?",
    "null",  # Browser origin when index.html is opened directly via file://.
]
