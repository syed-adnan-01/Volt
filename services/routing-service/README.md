# VOLT Member 5 – EV Routing & Multi-Stop Optimization Service

Welcome to the **VOLT Member 5 Routing Service**. This service provides intelligent, multi-factor EV route planning, multi-stop charging optimization, explicit optimization modes, real-time rerouting with hysteresis, charger filtering, and strategy benchmarking.

---

## 🚀 Quick Start

### Installation & Test Execution
```bash
# Compile TypeScript
npx tsc --noEmit

# Run complete test suite (10 test files)
npm test

# Execute demonstration & benchmark comparison
npx tsx src/index.ts
```

---

## 📡 REST API Endpoints

### 1. Health Check
`GET /health`
#### Response (200 OK):
```json
{
  "status": "ok"
}
```

---

### 2. Plan EV Route
`POST /api/route/plan`

Calculates the optimal EV route (0, 1, or multi-stop) considering driving duration, detour, charging time, predicted wait time, battery risk, charger reliability, and connector compatibility.

#### Request Example:
```json
{
  "origin": {
    "name": "Bengaluru",
    "lat": 12.9716,
    "lon": 77.5946
  },
  "destination": {
    "name": "Mysuru",
    "lat": 12.2958,
    "lon": 76.6394
  },
  "ev": {
    "batteryCapacityKwh": 60,
    "consumptionKwhPerKm": 0.15,
    "initialSoCPct": 40,
    "minSoCBufferPct": 20,
    "chargingPowerKw": 60
  },
  "mode": "BALANCED",
  "connectorTypes": ["CCS2"],
  "minPowerKw": 50,
  "predictions": {
    "C001": {
      "stationId": "C001",
      "availabilityProbability": 0.95,
      "expectedWaitMinutes": 0,
      "reliabilityScore": 0.95,
      "confidence": 0.95
    }
  }
}
```

#### Response Example (200 OK):
```json
{
  "origin": { "name": "Bengaluru", "lat": 12.9716, "lon": 77.5946 },
  "destination": { "name": "Mysuru", "lat": 12.2958, "lon": 76.6394 },
  "totalDistanceKm": 143.2,
  "totalDrivingDurationMinutes": 122.7,
  "totalChargingDurationMinutes": 9.7,
  "totalPredictedWaitMinutes": 0,
  "totalTripDurationMinutes": 132.4,
  "initialSoCPct": 40,
  "destinationSoCPct": 20.4,
  "totalCost": 0.1000,
  "mode": "BALANCED",
  "reason": "Selected this multi-stop route via Bidadi Fast Charger...",
  "stops": [
    {
      "charger": {
        "id": "C004",
        "name": "Bidadi Fast Charger",
        "lat": 12.7984,
        "lon": 77.3828,
        "powerKw": 60,
        "connectorType": "CCS2"
      },
      "socBeforeChargingPct": 31.8,
      "socAfterChargingPct": 48.0,
      "energyChargedKwh": 9.72,
      "chargingTimeMinutes": 9.7,
      "legDistanceToChargerKm": 32.7,
      "prediction": { "stationId": "C004", "expectedWaitMinutes": 0, "reliabilityScore": 0.85 }
    }
  ],
  "legs": [
    { "from": "Bengaluru", "to": "Bidadi Fast Charger", "distanceKm": 32.7, "durationMinutes": 35.9, "startSoCPct": 40.0, "endSoCPct": 31.8 },
    { "from": "Bidadi Fast Charger", "to": "Mysuru", "distanceKm": 110.5, "durationMinutes": 86.7, "startSoCPct": 48.0, "endSoCPct": 20.4 }
  ],
  "alternatives": [
    {
      "rank": 2,
      "stops": [...],
      "totalTripDurationMinutes": 145.0,
      "totalCost": 0.2450,
      "reason": "Alternative #2 via Ramanagara Charger..."
    }
  ]
}
```

---

### 3. Real-Time Rerouting
`POST /api/route/reroute`

Reevaluates an in-progress trip when charger unavailability, wait time spikes, reliability drops, battery SoC changes, or driver route deviations occur. Enforces hysteresis to prevent route oscillation loops.

#### Request Example:
```json
{
  "currentLocation": {
    "name": "En-Route Ramanagara",
    "lat": 12.7150,
    "lon": 77.2810
  },
  "destination": {
    "name": "Mysuru",
    "lat": 12.2958,
    "lon": 76.6394
  },
  "ev": {
    "initialSoCPct": 30
  },
  "currentPlannedStops": ["C004"],
  "driverDeviated": true,
  "predictions": {
    "C004": {
      "stationId": "C004",
      "availabilityProbability": 0.1,
      "expectedWaitMinutes": 60,
      "reliabilityScore": 0.2
    }
  }
}
```

#### Response Example (200 OK):
```json
{
  "rerouteRecommended": true,
  "triggerEvent": "PLANNED_CHARGER_UNAVAILABLE (C004)",
  "rerouteReason": "Reroute recommended due to trigger: PLANNED_CHARGER_UNAVAILABLE (C004)...",
  "optimizedRoute": {
    "stops": [
      {
        "charger": { "id": "C001", "name": "Maddur Charger" }
      }
    ]
  }
}
```

---

## ⚙️ Explicit Optimization Modes

The service supports 4 optimization modes via `mode`:
- **`BALANCED`** (Default): Equalized multi-factor trade-offs across drive, detour, wait, charging, risk, and reliability.
- **`FASTEST`**: Prioritizes minimizing total trip duration (drive, detour, wait, and charging duration).
- **`MOST_RELIABLE`**: Prioritizes high charger reliability scores and high prediction confidence.
- **`MINIMUM_CHARGING`**: Minimizes charging duration and number of charging stops.

---

## 📊 Strategy Benchmarking

Run the strategy benchmark suite to compare VOLT Optimization against baseline strategies:
```bash
npx tsx src/benchmark/strategyBenchmark.ts
```

| Strategy | Drive (m) | Charge (m) | Wait (m) | Total Trip (m) | Stops | Dest SoC | Route Cost |
|---|---|---|---|---|---|---|---|
| **VOLT Multi-Factor** | 122.7 | 9.7 | 0 | 132.4 | 1 | 20.4% | 0.1000 |
| **Fastest Power** | 122.7 | 9.7 | 0 | 132.4 | 1 | 20.4% | 0.0850 |
| **Availability & Reliability** | 127.2 | 9.6 | 0 | 136.8 | 1 | 20.1% | 0.0500 |
| **Minimum Charging** | 122.7 | 9.7 | 0 | 132.4 | 1 | 20.4% | 0.1100 |

---

## 🛡️ Safety & Fallback Hierarchy

1. **Battery Safety Constraint**: Every leg must arrive at a charger or destination with $\text{arrivalSoCPct} \ge \text{minSoCBufferPct}$ (default 20%).
2. **Destination Charger Exclusion**: Chargers located at/near destination ($\le 5\text{ km}$) are excluded from intermediate charging candidates.
3. **Fallback Hierarchy**:
   - `MULTI_STOP_OPTIMIZED` -> `SINGLE_STOP_FALLBACK` -> `NEAREST_SAFE_CHARGER`
   - Returns 422 Unprocessable Entity if no safe route exists.
