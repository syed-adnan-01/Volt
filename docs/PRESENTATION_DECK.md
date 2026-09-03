# VOLT: AI-Powered Predictive EV Journey Optimization Platform
## Capstone Defense Presentation Deck

---

## Slide 1: Title & Team Overview
### **VOLT: AI-Powered Predictive EV Journey Optimization Platform**
*Sub-title:* Eliminating Range & Charging Anxiety Through Physics-Informed Multi-Stop Optimization and Machine Learning

**Engineering Team Roles:**
- **Member 1 (Backend & Database Architecture):** PostgreSQL/PostGIS, Redis, Gateway Orchestration
- **Member 2 (Frontend & Android Mobile):** Jetpack Compose, Google Maps SDK, Location Autocomplete & FCM
- **Member 3 (Battery Physics & Energy Intelligence):** CC-CV Charging Kinetics, Environmental Drain & SOH
- **Member 4 (AI/ML & Charger Intelligence):** XGBoost Station Availability & Queue Wait Time Models
- **Member 5 (Routing & Multi-Stop Optimization):** Corridor Graph Search, Dynamic In-Flight Rerouting

---

## Slide 2: The Core Problem
### **Why EV Navigation is Broken Today**
- **Range Anxiety:** Real-world battery consumption varies up to **40%** based on speed, cabin HVAC, and freezing temperatures.
- **Charging Anxiety:** Drivers arrive at charging stations only to find **broken plugs, long queues, or slow 50 kW speeds**.
- **Naive "Greedy" Navigation:** Commercial apps route drivers to the *nearest* charger when battery is low, causing extreme wait times and unnecessary detours.

```
Traditional Navigation:
[Origin] ───────────────> [Nearest Congested 50kW Charger (45m wait)] ───────> [Destination]
                                                                        (Total: +1 hr delay)

VOLT Predictive Navigation:
[Origin] ───────────────────────────> [High-Speed 150kW Open Charger (0m wait)] ──> [Destination]
                                                                        (Saved 35.1 minutes)
```

---

## Slide 3: High-Level System Architecture
### **A Decoupled, Polyglot Monorepo Architecture**
- **Mobile Client:** Native Android (Kotlin + Compose), Google Maps SDK, Location Recommendations, FCM Push.
- **API Gateway:** Node.js Express, Knex ORM, PostGIS spatial queries, Redis cache.
- **Battery Engine:** Pure TypeScript physics engine implementing CC-CV curves, degradation, and temperature models.
- **ML Microservice:** Python FastAPI microservice serving XGBoost/LightGBM inference models ($<2\text{ ms}$).
- **Routing Engine:** OSRM corridor filtering with Multi-Stop Heuristic Cost Optimization.

---

## Slide 4: Subsystem 1 & 2 — Battery Physics & ML Predictions
### **Combining Electrochemistry with Machine Learning**
- **Non-linear CC-CV Charging:**
  - $0\% \to 80\%$: Constant Current maximum power intake.
  - $80\% \to 100\%$: Exponential power tapering to protect cell chemistry.
- **Environmental Physics:**
  - Dynamic consumption adjustments for temperature, speed drag, and elevation gain.
- **ML Charger Intelligence:**
  - **Availability Classifier (XGBoost):** **89.7% Recall** on available plugs.
  - **Queue Wait Time Regressor:** **20.4% lower error (MAE 4.6 min)** vs. static historical averages.

---

## Slide 5: Subsystem 3 — Multi-Stop Routing & Optimization
### **Multi-Factor Constrained Optimization**
- **Cost Formulation:**
  $$\text{Cost} = w_{\text{drive}} \cdot T_{\text{drive}} + w_{\text{charge}} \cdot T_{\text{charge}} + w_{\text{wait}} \cdot \hat{T}_{\text{wait}} + \text{Penalty}_{\text{risk}}$$
- **Ranked Strategies:**
  - 🥇 **Recommended (Balanced):** Minimizes total trip duration while avoiding unreliable stations.
  - ⚡ **Fastest:** Prioritizes ultra-high power (150kW+) chargers.
  - 🛑 **Minimum Stops:** Stretches driving legs to minimize charging stop count.
- **Dynamic In-Flight Rerouting:**
  - Automatically reroutes when planned stations fail or queue times spike.
  - **Hysteresis (10% threshold) & 3-minute cooldown** prevent route oscillation.

---

## Slide 6: Mobile Client Experience
### **Native Android App (Jetpack Compose + Google Maps)**
- **Interactive Google Maps View:** Renders dark-themed OSRM route polylines with color-coded pins (Origin, Chargers, Destination).
- **Location Recommendations:** Live debounced search as you type + instant EV corridor suggestions.
- **GPS "Use Current Location":** 1-tap device GPS coordinate retrieval with reverse geocoding and auto-distance calculation.
- **Real-Time Push Alerts:** Firebase Cloud Messaging (FCM) notifications for reroutes and low-battery alerts.

---

## Slide 7: Experimental Results & Benchmarks
### **Empirical Performance Comparison (145 km Inter-City Corridor)**

| Routing Approach | Total Trip Duration | Charging Time | Wait Time | Time Saved |
|---|---|---|---|---|
| **VOLT Predictive (Balanced)** | **153.4 min** | **22.4 min** | **2.5 min** | **Optimal** |
| **Availability Only** | 159.7 min | 26.5 min | 3.0 min | -6.3 min |
| **Fastest Charger Only** | 171.5 min | 19.5 min | 18.0 min | -18.1 min |
| **Greedy Nearest Charger** | 188.5 min | 38.0 min | 24.5 min | **-35.1 min (22.9% slower)** |

- **Optimizer Scalability:** Computes routes up to 1,200 km in $<500\text{ ms}$.
- **Test Coverage:** **100% Pass Rate** across 151+ unit, integration, and E2E demo tests.

---

## Slide 8: Live Demonstration of 5 Capstone Scenarios
1. **Scenario 1: Direct Reachable Trip** (San Francisco ➔ Palo Alto, 55 km, 0 stops).
2. **Scenario 2: Multi-Stop Corridor Optimization** (Long-haul route with 25% starting SoC planning optimal stops).
3. **Scenario 3: Severe Weather High Drain** (Sub-zero temperatures increasing charging requirements safely).
4. **Scenario 4: Dynamic In-Flight Reroute** (Station failure triggering seamless alternative selection).
5. **Scenario 5: Degraded Battery Safety** (80% SOH battery pack enforcing higher safety buffers).

---

## Slide 9: Conclusion & Project Impact
### **Summary of Achievements**
- ✅ Complete full-stack EV platform built across 5 engineering domains.
- ✅ Eliminated range anxiety through verified physics models.
- ✅ Eliminated charging anxiety through ML wait-time predictions.
- ✅ Monorepo fully verified: All backend services, ML pipelines, and Android native client build and pass tests.

**Thank you! Questions & Discussion.**
