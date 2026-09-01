import pandas as pd
from datetime import datetime

def validate_stations(df):
    """
    Checks the station master data (from Phase 1/2) for problems.
    Returns: (clean_df, issues_log)
    """
    issues = []

    # Check 1: Missing station IDs
    missing_id_rows = df[df["station_id"].isna()]
    for idx in missing_id_rows.index:
        issues.append({"row": idx, "issue": "Missing station_id", "value": None})

    # Check 2: Duplicate station IDs
    duplicate_rows = df[df.duplicated(subset="station_id", keep="first")]
    for idx in duplicate_rows.index:
        issues.append({"row": idx, "issue": "Duplicate station_id", "value": df.loc[idx, "station_id"]})

    # Check 3: Invalid coordinates (outside real-world range, or exactly 0,0)
    invalid_coords = df[
        (df["latitude"] < -90) | (df["latitude"] > 90) |
        (df["longitude"] < -180) | (df["longitude"] > 180) |
        ((df["latitude"] == 0) & (df["longitude"] == 0))
    ]
    for idx in invalid_coords.index:
        issues.append({"row": idx, "issue": "Invalid coordinates",
                        "value": f"({df.loc[idx, 'latitude']}, {df.loc[idx, 'longitude']})"})

    # Check 4: Impossible connector counts (must be at least 1)
    bad_connector_counts = df[df["num_connectors"] <= 0]
    for idx in bad_connector_counts.index:
        issues.append({"row": idx, "issue": "Impossible connector count",
                        "value": df.loc[idx, "num_connectors"]})

    # Now remove the bad rows (missing ID, duplicates, invalid coordinates, bad connector counts)
    bad_indexes = set(missing_id_rows.index) | set(duplicate_rows.index) | \
                  set(invalid_coords.index) | set(bad_connector_counts.index)

    clean_df = df.drop(index=bad_indexes).reset_index(drop=True)

    return clean_df, issues


def validate_observations(df):
    """
    This will be reused later in Phase 4, for checking historical
    availability records (occupancy, wait times, timestamps).
    """
    issues = []

    # Check 1: Occupied connectors can never exceed total connectors
    impossible_occupancy = df[df["occupied_connectors"] > df["total_connectors"]]
    for idx in impossible_occupancy.index:
        issues.append({"row": idx, "issue": "Impossible occupancy (occupied > total)",
                        "value": f"{df.loc[idx, 'occupied_connectors']} > {df.loc[idx, 'total_connectors']}"})

    # Check 2: Negative wait times don't make sense
    if "wait_minutes" in df.columns:
        negative_waits = df[df["wait_minutes"] < 0]
        for idx in negative_waits.index:
            issues.append({"row": idx, "issue": "Negative wait time", "value": df.loc[idx, "wait_minutes"]})

    # Remove rows with these issues
    bad_indexes = set(impossible_occupancy.index)
    if "wait_minutes" in df.columns:
        bad_indexes |= set(negative_waits.index)

    clean_df = df.drop(index=bad_indexes).reset_index(drop=True)

    return clean_df, issues


def save_quality_log(issues, filename="ml/datasets/processed/data_quality_log.csv"):
    if not issues:
        print("No data quality issues found.")
        return

    log_df = pd.DataFrame(issues)
    log_df["checked_at"] = datetime.now().isoformat()
    log_df.to_csv(filename, index=False)
    print(f"Logged {len(issues)} data quality issues to {filename}")


if __name__ == "__main__":
    INPUT_FILE = "ml/datasets/processed/charger_stations_clean.csv"
    OUTPUT_FILE = "ml/datasets/processed/charger_stations_validated.csv"

    df = pd.read_csv(INPUT_FILE)
    print(f"Loaded {len(df)} stations for quality checking")

    clean_df, issues = validate_stations(df)

    save_quality_log(issues)
    clean_df.to_csv(OUTPUT_FILE, index=False)

    print(f"Saved {len(clean_df)} validated stations to {OUTPUT_FILE}")
    print(f"Removed {len(df) - len(clean_df)} problematic rows")
