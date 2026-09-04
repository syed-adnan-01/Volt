# Production Dockerfile for VOLT ML Prediction Service
FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY services/prediction-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML models and application source
COPY ml /app/ml
COPY services/prediction-service/app /app/services/prediction-service/app

WORKDIR /app/services/prediction-service/app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
