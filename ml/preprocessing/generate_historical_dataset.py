import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from data_quality import validate_observations, save_quality_log

STATIONS_FILE = "ml/datasets/processed/charger_stations_validated.csv"
OUTPUT_FILE = "ml/datasets/processed/historical_observations.csv"

DAYS_OF_HISTORY = 30  # simulate the last 30 days

def load_stations():
    return pd.read_csv(STATIONS_FILE)

def simulate_occupancy(hour, is_weekend):
    """
    Decides how busy a station is, based on realistic patterns.
    Returns a ratio between 0 (empty) and 1 (fully occupied) -
    used as a PROBABILITY per connector, not rounded directly.
    """
    is_rush_hour = (8 <= hour <= 10) or (18 <= hour <= 20)

    if is_rush_hour and not is_weekend:
        base_occupancy = 0.7
    elif is_weekend:
        base_occupancy = 0.35
    else:
        base_occupancy = 0.25

    base_occupancy += random.uniform(-0.1, 0.1)
    base_occupancy = max(0.0, min(base_occupancy, 1.0))

    return base_occupancy

def generate_observations(stations_df):
    records = []
    now = datetime.now()

    for _, station in stations_df.iterrows():
        station_id = station["station_id"]
        total_connectors = int(station["num_connectors"])

        for day_offset in range(DAYS_OF_HISTORY):
            date = now - timedelta(days=day_offset)
            is_weekend = date.weekday() >= 5  # Saturday=5, Sunday=6

            for hour in range(24):
                occupancy_ratio = simulate_occupancy(hour, is_weekend)

                # Each connector gets its own weighted "coin flip"
                occupied_connectors = np.random.binomial(total_connectors, occupancy_ratio)
                occupied_connectors = min(occupied_connectors, total_connectors)
                available_connectors = total_connectors - occupied_connectors

                status = "Operational"
                if random.random() < 0.02:  # 2% chance of being down
                    status = "Faulted"
                    occupied_connectors = 0
                    available_connectors = 0

                # Simulate wait time
                is_rush_hour = (8 <= hour <= 10) or (18 <= hour <= 20)
                if available_connectors > 0:
                    wait_minutes = 0
                elif status == "Faulted":
                    wait_minutes = 0
                else:
                    if is_rush_hour:
                        wait_minutes = random.randint(10, 30)
                    else:
                        wait_minutes = random.randint(5, 15)

                timestamp = date.replace(hour=hour, minute=0, second=0, microsecond=0)

                records.append({
                    "station_id": station_id,
                    "timestamp": timestamp.isoformat(),
                    "source": "SIMULATED",
                    "available_connectors": available_connectors,
                    "occupied_connectors": occupied_connectors,
                    "total_connectors": total_connectors,
                    "status": status,
                    "wait_minutes": wait_minutes
                })

    return pd.DataFrame(records)

def add_derived_fields(df):
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.day_name()
    df["is_weekend"] = df["timestamp"].dt.weekday >= 5

    df["occupancy_rate"] = df["occupied_connectors"] / df["total_connectors"]
    df["availability_rate"] = df["available_connectors"] / df["total_connectors"]

    return df

if __name__ == "__main__":
    stations = load_stations()
    print(f"Generating history for {len(stations)} stations over {DAYS_OF_HISTORY} days...")

    observations = generate_observations(stations)
    print(f"Generated {len(observations)} raw observations")

    clean_observations, issues = validate_observations(observations)
    save_quality_log(issues, filename="ml/datasets/processed/historical_quality_log.csv")

    final_df = add_derived_fields(clean_observations)
    final_df.to_csv(OUTPUT_FILE, index=False)

    print(f"Saved {len(final_df)} validated observations to {OUTPUT_FILE}")
    print("\nFirst 5 rows:")
    print(final_df.head())
