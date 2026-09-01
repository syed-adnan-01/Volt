import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
import joblib

INPUT_FILE = "ml/datasets/processed/features_dataset.csv"
MODEL_OUTPUT = "ml/models/availability_model.pkl"
COLUMNS_OUTPUT = "ml/models/availability_model_columns.pkl"

TRAVEL_HOURS_AHEAD = 2  # simulating "driver arrives 2 hours from now"

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["station_id", "timestamp"])
    return df

def create_future_target(df):
    """
    For each row, look FORWARD in time (within the same station) to see
    what availability looked like a couple hours later. That future value
    becomes our real target - not the current row's own availability.
    """
    df["future_available_connectors"] = (
        df.groupby("station_id")["available_connectors"].shift(-TRAVEL_HOURS_AHEAD)
    )
    df["future_hour"] = df.groupby("station_id")["hour"].shift(-TRAVEL_HOURS_AHEAD)
    df["future_day_of_week_num"] = df.groupby("station_id")["day_of_week_num"].shift(-TRAVEL_HOURS_AHEAD)

    # The last couple hours of each station's data won't have a "future" row - drop those
    df = df.dropna(subset=["future_available_connectors"])

    df["target_available"] = (df["future_available_connectors"] > 0).astype(int)
    return df

def prepare_features(df):
    df["is_weekend"] = df["is_weekend"].astype(int)

    feature_columns = [
        "hour", "day_of_week_num", "is_weekend", "month",
        "occupancy_rate",            # current_occupancy - known NOW
        "available_connectors",      # current state - known NOW
        "total_connectors",
        "historical_occupancy_rate",
        "historical_availability_rate",
        "station_reliability",
        "data_age_minutes",
    ]

    X = df[feature_columns].copy()
    # These represent the ARRIVAL time - the key feature the document calls "critical"
    X["estimated_arrival_hour"] = df["future_hour"]
    X["estimated_arrival_day"] = df["future_day_of_week_num"]

    y = df["target_available"]
    return X, y

if __name__ == "__main__":
    df = load_data()
    print(f"Loaded {len(df)} rows")

    df = create_future_target(df)
    print(f"{len(df)} rows remain after creating future targets")

    X, y = prepare_features(df)

    # Quick honesty check: what would a "lazy guesser" score?
    majority_class_rate = y.value_counts(normalize=True).max()
    print(f"Baseline (always guessing majority class): {majority_class_rate*100:.1f}%")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBClassifier(eval_metric="logloss")
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Model Accuracy: {accuracy*100:.1f}%")

    joblib.dump(model, MODEL_OUTPUT)
    joblib.dump(X.columns.tolist(), COLUMNS_OUTPUT)
    print(f"\nModel saved to {MODEL_OUTPUT}")
