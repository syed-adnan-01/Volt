import pandas as pd

INPUT_FILE = "ml/datasets/processed/historical_observations.csv"
OUTPUT_FILE = "ml/datasets/processed/features_dataset.csv"

def load_data():
    df = pd.read_csv(INPUT_FILE)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df

def add_basic_time_features(df):
    df["month"] = df["timestamp"].dt.month
    df["day_of_week_num"] = df["timestamp"].dt.dayofweek  # Monday=0 ... Sunday=6
    return df

def add_station_reliability(df):
    reliability = df.groupby("station_id")["status"].apply(
        lambda x: (x != "Faulted").mean()
    ).rename("station_reliability")

    df = df.merge(reliability, on="station_id", how="left")
    return df

def add_historical_rates(df):
    station_avg = df.groupby("station_id").agg(
        historical_occupancy_rate=("occupancy_rate", "mean"),
        historical_availability_rate=("availability_rate", "mean")
    )
    df = df.merge(station_avg, on="station_id", how="left")
    return df

def add_historical_wait(df):
    # Average wait time for each station, across its history
    wait_avg = df.groupby("station_id").agg(
        historical_avg_wait=("wait_minutes", "mean")
    )
    df = df.merge(wait_avg, on="station_id", how="left")
    return df

def add_same_hour_pattern(df):
    hour_avg = df.groupby(["station_id", "hour"]).agg(
        same_hour_historical_occupancy=("occupancy_rate", "mean")
    )
    df = df.merge(hour_avg, on=["station_id", "hour"], how="left")
    return df

def add_rolling_features(df):
    df = df.sort_values(["station_id", "timestamp"])

    df["rolling_1h_occupancy"] = (
        df.groupby("station_id")["occupancy_rate"]
        .transform(lambda x: x.rolling(window=1, min_periods=1).mean())
    )
    df["rolling_3h_occupancy"] = (
        df.groupby("station_id")["occupancy_rate"]
        .transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    )
    df["rolling_24h_occupancy"] = (
        df.groupby("station_id")["occupancy_rate"]
        .transform(lambda x: x.rolling(window=24, min_periods=1).mean())
    )
    return df

def add_arrival_time_features(df):
    # For TRAINING data, the observation's own hour/day IS the "arrival" moment
    # we're learning from. At live prediction time, this becomes the driver's
    # actual estimated arrival hour/day instead (Phase 15).
    df["estimated_arrival_hour"] = df["hour"]
    df["estimated_arrival_day"] = df["day_of_week_num"]
    return df

def add_data_age(df):
    df["data_age_minutes"] = 0
    return df

if __name__ == "__main__":
    df = load_data()
    print(f"Loaded {len(df)} historical observations")

    df = add_basic_time_features(df)
    df = add_station_reliability(df)
    df = add_historical_rates(df)
    df = add_historical_wait(df)
    df = add_same_hour_pattern(df)
    df = add_rolling_features(df)
    df = add_arrival_time_features(df)
    df = add_data_age(df)

    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Saved feature-engineered dataset to {OUTPUT_FILE}")
    print(f"Total columns now: {len(df.columns)}")
    print("\nFirst 5 rows:")
    print(df.head())
