import pandas as pd

FEATURES_FILE = "ml/datasets/processed/features_dataset.csv"
RELIABILITY_FILE = "ml/models/station_reliability_scores.csv"
CONFIDENCE_FILE = "ml/models/station_confidence_scores.csv"
OUTPUT_FILE = "ml/models/station_lookup.csv"

def build_lookup():
    features_df = pd.read_csv(FEATURES_FILE)

    station_stats = features_df.groupby("station_id").agg(
        historical_occupancy_rate=("historical_occupancy_rate", "first"),
        historical_availability_rate=("historical_availability_rate", "first"),
        historical_avg_wait=("historical_avg_wait", "first"),
        station_reliability=("station_reliability", "first"),
        total_connectors=("total_connectors", "first"),
    ).reset_index()

    reliability_df = pd.read_csv(RELIABILITY_FILE)[["station_id", "reliability_score"]]
    confidence_df = pd.read_csv(CONFIDENCE_FILE)[["station_id", "confidence_score"]]

    lookup = station_stats.merge(reliability_df, on="station_id", how="left")
    lookup = lookup.merge(confidence_df, on="station_id", how="left")

    lookup.to_csv(OUTPUT_FILE, index=False)
    print(f"Saved lookup table for {len(lookup)} stations to {OUTPUT_FILE}")

if __name__ == "__main__":
    build_lookup()
