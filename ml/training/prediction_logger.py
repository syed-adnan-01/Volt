import pandas as pd
import os
from datetime import datetime
import uuid

# Build an absolute path based on THIS file's own location,
# so it works correctly no matter where the server is started from
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "models", "prediction_log.csv")

def log_prediction(station_id, model_version, input_timestamp,
                    availability_probability, expected_wait_minutes):
    entry = {
        "prediction_id": str(uuid.uuid4()),
        "station_id": station_id,
        "model_version": model_version,
        "input_timestamp": input_timestamp,
        "prediction_timestamp": datetime.now().isoformat(),
        "availability_probability": availability_probability,
        "expected_wait_minutes": expected_wait_minutes,
    }

    df = pd.DataFrame([entry])
    file_exists = os.path.exists(LOG_FILE)
    df.to_csv(LOG_FILE, mode="a" if file_exists else "w", header=not file_exists, index=False)

    return entry

if __name__ == "__main__":
    # Quick manual test
    result = log_prediction(
        station_id=103606,
        model_version="availability_v1",
        input_timestamp=datetime.now().isoformat(),
        availability_probability=0.82,
        expected_wait_minutes=6
    )
    print("Logged prediction:")
    print(result)
