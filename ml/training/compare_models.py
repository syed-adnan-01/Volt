import pandas as pd
import time
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import f1_score, roc_auc_score, mean_absolute_error
from xgboost import XGBClassifier, XGBRegressor

INPUT_FILE = "ml/datasets/processed/features_dataset.csv"
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
    df = df.sort_values("timestamp")
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)
    return df.iloc[:train_end], df.iloc[train_end:val_end], df.iloc[val_end:]

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

def time_inference(model, X_test):
    start = time.time()
    model.predict(X_test)
    elapsed_ms = (time.time() - start) * 1000
    return elapsed_ms / len(X_test)  # average ms per single prediction

def compare_availability_models(train_df, test_df):
    X_train, y_train = build_X(train_df), train_df["target_available"]
    X_test, y_test = build_X(test_df), test_df["target_available"]

    candidates = {
        "Baseline (majority class)": DummyClassifier(strategy="most_frequent"),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "XGBoost": XGBClassifier(eval_metric="logloss"),
    }

    results = []
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)

        # Dummy classifier can't give real probabilities - handle separately
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_test)[:, 1]
            auc = roc_auc_score(y_test, probs)
        else:
            auc = float("nan")

        f1 = f1_score(y_test, predictions)
        inference_ms = time_inference(model, X_test)

        results.append({
            "Model": name, "F1": round(f1, 3),
            "ROC-AUC": round(auc, 3) if not pd.isna(auc) else "N/A",
            "Inference Time (ms/prediction)": round(inference_ms, 4)
        })

    return pd.DataFrame(results)

def compare_wait_models(train_df, test_df):
    X_train, y_train = build_X(train_df), train_df["future_wait_minutes"]
    X_test, y_test = build_X(test_df), test_df["future_wait_minutes"]

    candidates = {
        "Baseline (mean wait)": DummyRegressor(strategy="mean"),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
        "XGBoost": XGBRegressor(),
    }

    results = []
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)

        mae = mean_absolute_error(y_test, predictions)
        inference_ms = time_inference(model, X_test)

        results.append({
            "Model": name, "MAE (minutes)": round(mae, 3),
            "Inference Time (ms/prediction)": round(inference_ms, 4)
        })

    return pd.DataFrame(results)

if __name__ == "__main__":
    df = load_data()
    df = create_future_targets(df)
    train_df, val_df, test_df = chronological_split(df)

    print("=== Availability Model Comparison ===")
    avail_results = compare_availability_models(train_df, test_df)
    print(avail_results.to_string(index=False))

    print("\n=== Wait-Time Model Comparison ===")
    wait_results = compare_wait_models(train_df, test_df)
    print(wait_results.to_string(index=False))

    avail_results.to_csv("ml/models/availability_model_comparison.csv", index=False)
    wait_results.to_csv("ml/models/wait_model_comparison.csv", index=False)
    print("\nSaved both comparison tables.")
