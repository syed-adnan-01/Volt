import requests
import csv
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENCHARGEMAP_API_KEY")

# We'll search near Bengaluru, within 50 km
LATITUDE = 12.9716
LONGITUDE = 77.5946
DISTANCE_KM = 50
MAX_RESULTS = 50

def fetch_stations():
    url = "https://api.openchargemap.io/v3/poi/"
    params = {
        "output": "json",
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "distance": DISTANCE_KM,
        "distanceunit": "km",
        "maxresults": MAX_RESULTS,
        "key": API_KEY
    }

    response = requests.get(url, params=params)
    response.raise_for_status()  # stops the script clearly if something went wrong
    return response.json()

def extract_fields(raw_stations):
    cleaned_records = []

    for station in raw_stations:
        # Some fields are nested inside sub-objects, so we check safely
        address_info = station.get("AddressInfo", {})
        connections = station.get("Connections", [])

        # A station can have multiple connectors - we'll take the first one's details
        first_connection = connections[0] if connections else {}

        record = {
            "station_id": station.get("ID"),
            "station_name": address_info.get("Title"),
            "operator": station.get("OperatorInfo", {}).get("Title") if station.get("OperatorInfo") else None,
            "latitude": address_info.get("Latitude"),
            "longitude": address_info.get("Longitude"),
            "connector_type": first_connection.get("ConnectionType", {}).get("Title") if first_connection.get("ConnectionType") else None,
            "charging_power": first_connection.get("PowerKW"),
            "num_connectors": len(connections),
            "status": station.get("StatusType", {}).get("Title") if station.get("StatusType") else "Unknown",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "NETWORK_API"
        }
        cleaned_records.append(record)

    return cleaned_records

def save_to_csv(records, filename="ml/datasets/raw/charger_stations.csv"):
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    print(f"Saved {len(records)} real stations to {filename}")

if __name__ == "__main__":
    raw_data = fetch_stations()
    cleaned = extract_fields(raw_data)
    save_to_csv(cleaned)
