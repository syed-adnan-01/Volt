import shutil
import glob
import os

MODELS_DIR = "ml/models"

def get_latest_file(pattern_prefix):
    pattern = f"{MODELS_DIR}/{pattern_prefix}_v2*.pkl"
    matches = sorted([f for f in glob.glob(pattern) if "columns" not in f])
    if not matches:
        raise FileNotFoundError(f"No trained versions found for {pattern_prefix}")
    return matches[-1]  # the most recent one

def promote(model_name, friendly_version="v1"):
    latest_model = get_latest_file(model_name)
    latest_columns = latest_model.replace(".pkl", "_columns.pkl")

    new_model_path = f"{MODELS_DIR}/{model_name}_{friendly_version}.pkl"
    new_columns_path = f"{MODELS_DIR}/{model_name}_{friendly_version}_columns.pkl"

    shutil.copy(latest_model, new_model_path)
    shutil.copy(latest_columns, new_columns_path)

    print(f"Promoted {latest_model} -> {new_model_path}")

if __name__ == "__main__":
    promote("availability_model", "v1")
    promote("wait_time_model", "v1")
