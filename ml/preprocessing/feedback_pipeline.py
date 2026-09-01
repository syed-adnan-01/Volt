import pandas as pd
import os
from datetime import datetime

FEEDBACK_FILE = "ml/datasets/processed/user_feedback.csv"

FEEDBACK_COLUMNS = [
    "feedback_id", "station_id", "reported_at",
    "actual_availability", "actual_wait_minutes",
    "queue_condition", "charger_working", "rating", "source"
]

def submit_feedback(station_id, actual_availability, actual_wait_minutes,
                     queue_condition, charger_working, rating):
    """
    Takes one piece of user feedback and safely appends it to our
    feedback dataset. This is what Member 1's backend will call
    whenever a real user submits a report after charging.
    """
    new_entry = {
        "feedback_id": generate_feedback_id(),
        "station_id": station_id,
        "reported_at": datetime.now().isoformat(),
        "actual_availability": actual_availability,   # True/False
        "actual_wait_minutes": actual_wait_minutes,
        "queue_condition": queue_condition,            # "light" / "moderate" / "heavy"
        "charger_working": charger_working,             # True/False
        "rating": rating,                                # 1-5
        "source": "USER_FEEDBACK"
    }

    validate_feedback(new_entry)
    append_feedback(new_entry)
    return new_entry

def generate_feedback_id():
    # Simple unique ID based on current timestamp
    return f"FB-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

def validate_feedback(entry):
    """
    Basic sanity checks, similar spirit to our Phase 3 data quality checks.
    """
    if entry["actual_wait_minutes"] is not None and entry["actual_wait_minutes"] < 0:
        raise ValueError("Wait minutes cannot be negative")

    if entry["rating"] is not None and not (1 <= entry["rating"] <= 5):
        raise ValueError("Rating must be between 1 and 5")

    valid_queue_conditions = ["light", "moderate", "heavy", None]
    if entry["queue_condition"] not in valid_queue_conditions:
        raise ValueError(f"Invalid queue_condition: {entry['queue_condition']}")

def append_feedback(entry):
    file_exists = os.path.exists(FEEDBACK_FILE)

    df = pd.DataFrame([entry])

    if file_exists:
        df.to_csv(FEEDBACK_FILE, mode="a", header=False, index=False)
    else:
        df.to_csv(FEEDBACK_FILE, mode="w", header=True, index=False)

    print(f"Saved feedback {entry['feedback_id']} for station {entry['station_id']}")

if __name__ == "__main__":
    # Quick manual test - simulating what a real user submission might look like
    submit_feedback(
        station_id=103606,
        actual_availability=True,
        actual_wait_minutes=0,
        queue_condition="light",
        charger_working=True,
        rating=5
    )

    submit_feedback(
        station_id=103609,
        actual_availability=False,
        actual_wait_minutes=18,
        queue_condition="heavy",
        charger_working=True,
        rating=3
    )

    print("\nCurrent feedback log:")
    print(pd.read_csv(FEEDBACK_FILE))
