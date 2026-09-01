import pandas as pd
from datetime import datetime

INPUT_FILE = "ml/datasets/processed/features_dataset.csv"
OUTPUT_FILE = "ml/models/station_confidence_scores.csv"

# From Phase 6's actual test results - our model is right about 74.1% of the time overall.
# This is a global, honest number - we don't yet track per-station model error separately.
AVAILABILITY_MODEL_ACCURACY = 0.741

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df

def compute_confidence(df):
    key_features = [
        "occupancy_rate", "historical_occupancy_rate", "historical_avg_wait",
        "station_reliability", "same_hour_historical_occupancy"
    ]

    grouped = df.groupby("station_id").agg(
        total_observations=("station_id", "count"),
        most_recent_data=("timestamp", "max"),
    )

    # Data volume confidence - same capped idea as Phase 8
    grouped["data_volume_score"] = (grouped["total_observations"] / 500).clip(upper=1.0)

    # Freshness confidence
    now = datetime.now()
    grouped["data_age_days"] = (now - grouped["most_recent_data"]).dt.days
    grouped["freshness_score"] = (1 - (grouped["data_age_days"] / 30)).clip(lower=0, upper=1)

    # Feature completeness - what fraction of key feature values are NOT missing
    completeness = df.groupby("station_id")[key_features].apply(
        lambda x: x.notna().mean().mean()
    ).rename("feature_completeness")
    grouped = grouped.merge(completeness, on="station_id")

    # Historical model error, as a trust factor (same value for every station right now - honest limitation)
    grouped["model_accuracy_factor"] = AVAILABILITY_MODEL_ACCURACY

    # Combine into one confidence score
    grouped["confidence_score"] = (
        grouped["data_volume_score"] * 0.30 +
        grouped["freshness_score"] * 0.20 +
        grouped["feature_completeness"] * 0.20 +
        grouped["model_accuracy_factor"] * 0.30
    ).round(3)

    return grouped.reset_index()

if __name__ == "__main__":
    df = load_data()
    print(f"Loaded {len(df)} rows")

    confidence_df = compute_confidence(df)
    confidence_df.to_csv(OUTPUT_FILE, index=False)

    print(f"Computed confidence scores for {len(confidence_df)} stations")
    print(f"Saved to {OUTPUT_FILE}")
    print("\nSample scores:")
    print(confidence_df[["station_id", "confidence_score", "data_volume_score", "freshness_score", "feature_completeness"]].head())
