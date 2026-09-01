import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor
import joblib

INPUT_FILE = "ml/datasets/processed/features_dataset.csv"
MODEL_OUTPUT = "ml/models/wait_time_model.pkl"
COLUMNS_OUTPUT = "ml/models/wait_time_model_columns.pkl"

TRAVEL_HOURS_AHEAD = 2

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["station_id", "timestamp"])
    return df

def create_future_target(df):
    df["future_wait_minutes"] = (
        df.groupby("station_id")["wait_minutes"].shift(-TRAVEL_HOURS_AHEAD)
    )
    df["future_hour"] = df.groupby("station_id")["hour"].shift(-TRAVEL_HOURS_AHEAD)
    df["future_day_of_week_num"] = df.groupby("station_id")["day_of_week_num"].shift(-TRAVEL_HOURS_AHEAD)

    df = df.dropna(subset=["future_wait_minutes"])
    return df

def prepare_features(df):
    df["is_weekend"] = df["is_weekend"].astype(int)

    feature_columns = [
        "hour", "day_of_week_num", "is_weekend",
        "occupancy_rate",
        "available_connectors",
        "total_connectors",
        "historical_occupancy_rate",
        "historical_avg_wait",
        "station_reliability",
    ]

    X = df[feature_columns].copy()
    X["estimated_arrival_hour"] = df["future_hour"]
    X["estimated_arrival_day"] = df["future_day_of_week_num"]

    y = df["future_wait_minutes"]
    return X, y

if __name__ == "__main__":
    df = load_data()
    print(f"Loaded {len(df)} rows")

    df = create_future_target(df)
    print(f"{len(df)} rows remain after creating future targets")

    X, y = prepare_features(df)

    # Honesty check: what if we always predicted the average wait time?
    naive_prediction = [y.mean()] * len(y)
    naive_mae = mean_absolute_error(y, naive_prediction)
    print(f"Baseline (always guessing average wait): MAE = {naive_mae:.2f} minutes")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBRegressor()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5

    print(f"Model MAE: {mae:.2f} minutes")
    print(f"Model RMSE: {rmse:.2f} minutes")

    joblib.dump(model, MODEL_OUTPUT)
    joblib.dump(X.columns.tolist(), COLUMNS_OUTPUT)
    print(f"\nModel saved to {MODEL_OUTPUT}")
