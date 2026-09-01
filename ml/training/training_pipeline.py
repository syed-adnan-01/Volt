import pandas as pd
from sklearn.metrics import accuracy_score, mean_absolute_error, mean_squared_error
from xgboost import XGBClassifier, XGBRegressor
import joblib
from datetime import datetime
import json
import os

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
    df["future_wait_minutes"] = df.groupby("station_id")["wait_minutes"].shift(-TRAVEL_HOURS_AHEAD)
    df["future_hour"] = df.groupby("station_id")["hour"].shift(-TRAVEL_HOURS_AHEAD)
    df["future_day_of_week_num"] = df.groupby("station_id")["day_of_week_num"].shift(-TRAVEL_HOURS_AHEAD)

    df = df.dropna(subset=["future_available_connectors", "future_wait_minutes"])
    df["target_available"] = (df["future_available_connectors"] > 0).astype(int)
    return df

def chronological_split(df):
    """
    Instead of randomly shuffling rows, we split by actual TIME.
    Oldest 70% of dates -> training
    Next 15% -> validation
    Most recent 15% -> testing
    This mimics real life: you only ever have the past to learn from.
    """
    df = df.sort_values("timestamp")

    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]

    print(f"Train: {len(train_df)} rows ({train_df['timestamp'].min()} to {train_df['timestamp'].max()})")
    print(f"Validation: {len(val_df)} rows ({val_df['timestamp'].min()} to {val_df['timestamp'].max()})")
    print(f"Test: {len(test_df)} rows ({test_df['timestamp'].min()} to {test_df['timestamp'].max()})")

    return train_df, val_df, test_df

def get_feature_columns():
    return [
        "hour", "day_of_week_num", "is_weekend", "month",
        "occupancy_rate", "available_connectors", "total_connectors",
        "historical_occupancy_rate", "historical_availability_rate",
        "historical_avg_wait", "station_reliability", "data_age_minutes",
    ]

def build_X(df):
    X = df[get_feature_columns()].copy()
    X["estimated_arrival_hour"] = df["future_hour"]
    X["estimated_arrival_day"] = df["future_day_of_week_num"]
    return X

def train_availability_model(train_df, val_df, test_df):
    X_train, y_train = build_X(train_df), train_df["target_available"]
    X_val, y_val = build_X(val_df), val_df["target_available"]
    X_test, y_test = build_X(test_df), test_df["target_available"]

    model = XGBClassifier(eval_metric="logloss")
    model.fit(X_train, y_train)

    val_acc = accuracy_score(y_val, model.predict(X_val))
    test_acc = accuracy_score(y_test, model.predict(X_test))

    print(f"\nAvailability Model - Validation Accuracy: {val_acc*100:.1f}%")
    print(f"Availability Model - Test Accuracy: {test_acc*100:.1f}%")

    return model, X_train.columns.tolist(), {"val_accuracy": val_acc, "test_accuracy": test_acc}

def train_wait_model(train_df, val_df, test_df):
    X_train, y_train = build_X(train_df), train_df["future_wait_minutes"]
    X_val, y_val = build_X(val_df), val_df["future_wait_minutes"]
    X_test, y_test = build_X(test_df), test_df["future_wait_minutes"]

    model = XGBRegressor()
    model.fit(X_train, y_train)

    val_mae = mean_absolute_error(y_val, model.predict(X_val))
    test_mae = mean_absolute_error(y_test, model.predict(X_test))
    test_rmse = mean_squared_error(y_test, model.predict(X_test)) ** 0.5

    print(f"\nWait-Time Model - Validation MAE: {val_mae:.2f} minutes")
    print(f"Wait-Time Model - Test MAE: {test_mae:.2f} minutes")
    print(f"Wait-Time Model - Test RMSE: {test_rmse:.2f} minutes")

    return model, X_train.columns.tolist(), {"val_mae": val_mae, "test_mae": test_mae, "test_rmse": test_rmse}

def save_versioned_model(model, columns, metrics, model_name):
    version = datetime.now().strftime("v%Y%m%d_%H%M%S")

    model_path = f"{MODELS_DIR}/{model_name}_{version}.pkl"
    columns_path = f"{MODELS_DIR}/{model_name}_{version}_columns.pkl"

    joblib.dump(model, model_path)
    joblib.dump(columns, columns_path)

    # Save metadata about this version, so we always know what we're using
    metadata = {
        "model_name": model_name,
        "version": version,
        "trained_at": datetime.now().isoformat(),
        "metrics": metrics
    }
    metadata_path = f"{MODELS_DIR}/{model_name}_{version}_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved {model_name} version {version}")
    return version

if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)

    df = load_data()
    print(f"Loaded {len(df)} rows")

    df = create_future_targets(df)
    print(f"{len(df)} rows remain after creating future targets\n")

    train_df, val_df, test_df = chronological_split(df)

    avail_model, avail_columns, avail_metrics = train_availability_model(train_df, val_df, test_df)
    save_versioned_model(avail_model, avail_columns, avail_metrics, "availability_model")

    wait_model, wait_columns, wait_metrics = train_wait_model(train_df, val_df, test_df)
    save_versioned_model(wait_model, wait_columns, wait_metrics, "wait_time_model")
