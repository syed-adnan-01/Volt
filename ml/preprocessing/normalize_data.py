import pandas as pd

RAW_FILE = "ml/datasets/raw/charger_stations.csv"
PROCESSED_FILE = "ml/datasets/processed/charger_stations_clean.csv"

def load_data():
    return pd.read_csv(RAW_FILE)

def clean_data(df):
    # Step 1: Remove rows with missing or invalid coordinates
    df = df[(df["latitude"].notna()) & (df["longitude"].notna())]
    df = df[(df["latitude"] != 0) & (df["longitude"] != 0)]

    # Step 2: Fill missing station names with a clear placeholder
    df["station_name"] = df["station_name"].fillna("Unnamed Station")

    # Step 3: Standardize connector type text (lowercase, no extra spaces)
    df["connector_type"] = df["connector_type"].fillna("Unknown")
    df["connector_type"] = df["connector_type"].str.strip().str.lower()

    # Step 4: Fill missing charging power with 0 (means "unknown power")
    df["charging_power"] = df["charging_power"].fillna(0)

    # Step 5: Make sure num_connectors is never 0 or missing (assume at least 1)
    df["num_connectors"] = df["num_connectors"].fillna(1)
    df["num_connectors"] = df["num_connectors"].apply(lambda x: max(x, 1))

    # Step 6: Remove duplicate stations (same station_id appearing more than once)
    df = df.drop_duplicates(subset="station_id", keep="first")

    # Step 7: Reset the row numbering after all these changes
    df = df.reset_index(drop=True)

    return df

def save_clean_data(df):
    df.to_csv(PROCESSED_FILE, index=False)
    print(f"Saved {len(df)} cleaned stations to {PROCESSED_FILE}")

if __name__ == "__main__":
    raw_df = load_data()
    print(f"Loaded {len(raw_df)} raw stations")

    clean_df = clean_data(raw_df)
    save_clean_data(clean_df)

    print("\nFirst 5 cleaned rows:")
    print(clean_df.head())
