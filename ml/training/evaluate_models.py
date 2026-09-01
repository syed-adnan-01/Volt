import pandas as pd
import glob
import os
import joblib
import json
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score, brier_score_loss
)

INPUT_FILE = "ml/datasets/processed/features_dataset.csv"
MODELS_DIR = "ml/models"
TRAVEL_HOURS_AHEAD = 2

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["station_id", "timestamp"])
    return df

def create_future_targets(df):
    df["future_available_connectors"] = df.groupby("station_id")["available_connectors"].shift(-TRAVEL_HOURS_AHEAD)
    df["future_hour"] = df.groupby("station_id")["hour"].shift(-TRAVEL_HOURS_AHEAD)
    df["future_day_of_week_num"] = df.groupby("station_id")["day_of_week_num"].shift(-TRAVEL_HOURS_AHEAD)
    df = df.dropna(subset=["future_available_connectors"])
    df["target_available"] = (df["future_available_connectors"] > 0).astype(int)
    return df

def chronological_test_split(df):
    df = df.sort_values("timestamp")
    n = len(df)
    val_end = int(n * 0.85)
    return df.iloc[val_end:]  # same test portion as training_pipeline.py

def get_latest_model(model_name):
    """
    Finds the most recently saved version of a model, based on its
    timestamped filename (e.g. availability_model_v20260901_110742.pkl)
    """
    pattern = f"{MODELS_DIR}/{model_name}_v*.pkl"
    matches = sorted([f for f in glob.glob(pattern) if "columns" not in f])
    if not matches:
        raise FileNotFoundError(f"No saved versions found for {model_name}")
    latest_model_path = matches[-1]
    version = latest_model_path.split(f"{model_name}_")[-1].replace(".pkl", "")
    columns_path = f"{MODELS_DIR}/{model_name}_{version}_columns.pkl"
    return joblib.load(latest_model_path), joblib.load(columns_path), version

def build_X(df, columns):
    X = df.copy()
    X["estimated_arrival_hour"] = df["future_hour"]
    X["estimated_arrival_day"] = df["future_day_of_week_num"]
    return X[columns]

def evaluate_availability_model(test_df):
    model, columns, version = get_latest_model("availability_model")
    print(f"Evaluating availability_model {version}")

    X_test = build_X(test_df, columns)
    y_test = test_df["target_available"]

    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]  # probability of "available"

    metrics = {
        "precision": precision_score(y_test, predictions),
        "recall": recall_score(y_test, predictions),
        "f1": f1_score(y_test, predictions),
        "roc_auc": roc_auc_score(y_test, probabilities),
        "brier_score": brier_score_loss(y_test, probabilities),  # calibration check
    }

    print("\nAvailability Model - Real Evaluation Results:")
    for name, value in metrics.items():
        print(f"  {name}: {value:.3f}")

    return metrics, version

def save_evaluation_report(metrics, version, model_name):
    report_path = f"{MODELS_DIR}/{model_name}_{version}_evaluation.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nSaved evaluation report to {report_path}")

if __name__ == "__main__":
    df = load_data()
    df = create_future_targets(df)
    test_df = chronological_test_split(df)

    print(f"Evaluating on {len(test_df)} test rows (most recent, unseen data)\n")

    metrics, version = evaluate_availability_model(test_df)
    save_evaluation_report(metrics, version, "availability_model")
