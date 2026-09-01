import pandas as pd
from datetime import datetime

INPUT_FILE = "ml/datasets/processed/features_dataset.csv"
OUTPUT_FILE = "ml/models/station_reliability_scores.csv"

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df

def compute_reliability(df):
    grouped = df.groupby("station_id").agg(
        historical_availability_rate=("historical_availability_rate", "first"),
        uptime_rate=("station_reliability", "first"),
        total_observations=("station_id", "count"),
        failure_count=("status", lambda x: (x == "Faulted").sum()),
        most_recent_data=("timestamp", "max"),
    )

    # Data freshness: how many days old is our most recent info for this station?
    now = datetime.now()
    grouped["data_age_days"] = (now - grouped["most_recent_data"]).dt.days

    # Freshness score: 1.0 if very recent, decreasing the older it gets
    # (capped so it never goes below 0)
    grouped["freshness_score"] = (1 - (grouped["data_age_days"] / 30)).clip(lower=0, upper=1)

    # History confidence: stations with more recorded observations are more trustworthy
    # We cap this at 500 observations = "fully confident" on data volume
    grouped["history_confidence"] = (grouped["total_observations"] / 500).clip(upper=1.0)

    # Combine everything into one weighted reliability score
    grouped["reliability_score"] = (
        grouped["historical_availability_rate"] * 0.35 +
        grouped["uptime_rate"] * 0.35 +
        grouped["freshness_score"] * 0.15 +
        grouped["history_confidence"] * 0.15
    ).round(3)

    return grouped.reset_index()

if __name__ == "__main__":
    df = load_data()
    print(f"Loaded {len(df)} rows")

    reliability_df = compute_reliability(df)
    reliability_df.to_csv(OUTPUT_FILE, index=False)

    print(f"Computed reliability scores for {len(reliability_df)} stations")
    print(f"Saved to {OUTPUT_FILE}")
    print("\nSample scores:")
    print(reliability_df[["station_id", "reliability_score", "historical_availability_rate", "uptime_rate"]].head())
