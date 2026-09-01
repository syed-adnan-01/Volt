from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
import joblib
import uuid
import sys
import os

# Allow importing our prediction_logger from ml/training
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "training"))
from prediction_logger import log_prediction

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models")

app = FastAPI(title="VOLT Prediction Service")

# Load everything ONCE, when the app starts (not on every request - much faster)
availability_model = joblib.load(f"{MODELS_DIR}/availability_model_v1.pkl")
availability_columns = joblib.load(f"{MODELS_DIR}/availability_model_v1_columns.pkl")

wait_model = joblib.load(f"{MODELS_DIR}/wait_time_model_v1.pkl")
wait_columns = joblib.load(f"{MODELS_DIR}/wait_time_model_v1_columns.pkl")

station_lookup = pd.read_csv(f"{MODELS_DIR}/station_lookup.csv").set_index("station_id")

MODEL_VERSION = "availability_v1"
WAIT_MODEL_VERSION = "wait_v1"


class PredictionRequest(BaseModel):
    stationId: int
    arrivalTime: str          # e.g. "2026-09-01T18:40:00"
    currentOccupancy: float   # e.g. 0.67
    availableConnectors: int
    totalConnectors: int


class BatchPredictionRequest(BaseModel):
    stations: list[PredictionRequest]


def build_feature_row(request: PredictionRequest):
    if request.stationId not in station_lookup.index:
        raise HTTPException(status_code=404, detail=f"Station {request.stationId} not found in lookup table")

    stats = station_lookup.loc[request.stationId]
    arrival_dt = datetime.fromisoformat(request.arrivalTime)

    row = {
        "hour": arrival_dt.hour,
        "day_of_week_num": arrival_dt.weekday(),
        "is_weekend": int(arrival_dt.weekday() >= 5),
        "month": arrival_dt.month,
        "occupancy_rate": request.currentOccupancy,
        "available_connectors": request.availableConnectors,
        "total_connectors": request.totalConnectors,
        "historical_occupancy_rate": stats["historical_occupancy_rate"],
        "historical_availability_rate": stats["historical_availability_rate"],
        "historical_avg_wait": stats["historical_avg_wait"],
        "station_reliability": stats["station_reliability"],
        "data_age_minutes": 0,  # freshly received, so age is 0 right now
        "estimated_arrival_hour": arrival_dt.hour,
        "estimated_arrival_day": arrival_dt.weekday(),
    }
    return row, stats, arrival_dt


def predict_one(request: PredictionRequest):
    row, stats, arrival_dt = build_feature_row(request)

    X_avail = pd.DataFrame([row])[availability_columns]
    availability_probability = float(availability_model.predict_proba(X_avail)[0][1])

    X_wait = pd.DataFrame([row])[wait_columns]
    expected_wait_minutes = float(wait_model.predict(X_wait)[0])
    expected_wait_minutes = max(0, round(expected_wait_minutes, 1))  # never negative

    response = {
        "stationId": str(request.stationId),
        "availabilityProbability": round(availability_probability, 3),
        "expectedWaitMinutes": expected_wait_minutes,
        "reliabilityScore": round(float(stats["reliability_score"]), 3),
        "confidence": round(float(stats["confidence_score"]), 3),
        "modelVersion": MODEL_VERSION,
    }

    log_prediction(
        station_id=request.stationId,
        model_version=MODEL_VERSION,
        input_timestamp=datetime.now().isoformat(),
        availability_probability=response["availabilityProbability"],
        expected_wait_minutes=response["expectedWaitMinutes"],
    )

    return response


@app.get("/health")
def health():
    return {"status": "ok", "modelVersion": MODEL_VERSION}


@app.get("/model/version")
def model_version():
    return {"availabilityModel": MODEL_VERSION, "waitModel": WAIT_MODEL_VERSION}


@app.post("/predict")
def predict(request: PredictionRequest):
    return predict_one(request)


@app.post("/predict/batch")
def predict_batch(request: BatchPredictionRequest):
    predictions = [predict_one(station) for station in request.stations]
    return {"predictions": predictions}
