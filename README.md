# ⚡ VOLT — Intelligent EV Route Planner & Charging Platform

[![Android](https://img.shields.io/badge/Android-Kotlin%20%7C%20Jetpack%20Compose-3DDC84?style=for-the-badge&logo=android)](apps/mobile)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20TypeScript-339933?style=for-the-badge&logo=nodedotjs)](services/api)
[![Python](https://img.shields.io/badge/ML%20Engine-Python%20%7C%20PyTorch-3776AB?style=for-the-badge&logo=python)](services/prediction-service)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20PostGIS-4169E1?style=for-the-badge&logo=postgresql)](docker-compose.yml)
[![Docker](https://img.shields.io/badge/Containerization-Docker%20Compose-2496ED?style=for-the-badge&logo=docker)](docker-compose.yml)
[![Deploy](https://img.shields.io/badge/Cloud%20Deploy-Render%20Blueprint-46E3B7?style=for-the-badge&logo=render)](render.yaml)

**VOLT** is an end-to-end intelligent Electric Vehicle (EV) routing, range-estimation, and charging station optimization ecosystem. It combines real-world EV physics, OpenChargeMap live station networks, OSRM corridor routing, and PyTorch machine learning models to provide optimal EV journey planning without range anxiety.

---

## 🌟 Key Features

- 🔋 **Accurate Battery & SoC Physics Engine**: Evaluates battery capacity, reserve buffer, speed/terrain drain factors, and pre-charging range to accurately compute charger arrival SoC and energy requirements.
- ⚡ **Real Operational EV Charging Stations**: Powered by OpenChargeMap API and local PostGIS database to discover live chargers (Tata Power EZ Charge, Zeon Charging, Jio-bp pulse, Shell Recharge, Ather Grid, ChargeZone, Relux, etc.).
- 🗺️ **Corridor Multi-Waypoint Search**: Automatically samples corridor waypoints along route highways to display EV chargers across intermediate towns (e.g. Ramanagara, Channapatna, Maddur, Mandya).
- 🧠 **PyTorch ML Predictions**: Predicts charger availability probabilities and queue wait times using machine learning models trained on historical usage patterns.
- 🚗 **Custom EV Garage & Indian EV Catalog**: Supports 20+ pre-configured EV models (Tata Nexon EV, Punch EV, Curvv EV, MG Windsor EV, Creta EV, Mahindra XEV 9e, BE 6e, Ather 450X, Ola S1 Pro) + custom vehicle registration.
- 📍 **In-App & Google Maps Turn-by-Turn Navigation**: Real-time GPS location tracking with integrated map polyline navigation and seamless external Google Maps launching.

---

## 🏗️ Architecture & Microservices

Volt is built as a modular microservice ecosystem:

```
Volt Ecosystem
├── 📱 apps/mobile                  # Native Android App (Jetpack Compose, Kotlin, Coroutines)
├── 🌐 services/api                 # Express TypeScript API Gateway (Auth, Vehicles, Stations, Feedback)
├── ⚡ services/routing-service     # EV Route Optimizer & OSRM Engine (Single/Multi-Stop Optimization)
├── 🧠 services/prediction-service  # PyTorch FastAPI Machine Learning Service (Wait Times & Availability)
├── 🔋 services/battery-engine      # Battery Consumption & Health Degradation Model
└── 🐳 docker-compose.yml           # Local Orchestration (PostgreSQL/PostGIS, Redis, Microservices)
```

| Service | Technology Stack | Description |
| :--- | :--- | :--- |
| **Mobile App** | Kotlin, Jetpack Compose, Retrofit, Google Maps SDK | Native Android user interface for trip planning, station map, and garage management. |
| **API Gateway** | Node.js, Express, TypeScript, Prisma/PostGIS, Redis | Handles authentication, user garages, station reviews, and service routing. |
| **Routing Engine** | Node.js, TypeScript, OSRM API | Multi-stop EV routing algorithm balancing drive distance, queue wait times, and charger speeds. |
| **ML Prediction** | Python 3.11, FastAPI, PyTorch, NumPy | Predicts charger availability and queue times based on time-of-day, day-of-week, and charger power. |
| **Database** | PostgreSQL 16 + PostGIS, Redis 7 | Spatial database for charger locations and high-speed Redis caching. |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Docker Desktop** (or Docker Engine)
- **Node.js** (v20+) & **npm**
- **Android Studio** (Java 17 JDK)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Volt.git
cd Volt
```

### 2. Start Backend Microservices with Docker Compose

```bash
docker compose up -d --build
```

This will launch:
- **PostgreSQL / PostGIS** on `localhost:5432`
- **Redis** on `localhost:6379`
- **Prediction ML Service** on `localhost:8000`
- **Routing Optimizer** on `localhost:3001`
- **API Gateway** on `localhost:3000`

Verify backend status:
```bash
curl http://localhost:3000/health
```

### 3. Build & Run the Android App

Open the `apps/mobile` directory in **Android Studio**, select an Emulator or connected device, and run.

To build the APK from terminal:
```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; ./gradlew :app:assembleDebug
```
The generated APK will be located at:
`apps/mobile/app/build/outputs/apk/debug/app-debug.apk`

---

## ☁️ Cloud Deployment (Render.com)

Volt includes a 1-click **Render Blueprint** ([`render.yaml`](render.yaml)) for hosting all backend services online.

1. Push your repository to **GitHub**.
2. Go to **[dashboard.render.com](https://dashboard.render.com)** -> **New +** -> **Blueprint**.
3. Connect your GitHub repository and click **Apply**.
4. Once deployed, copy your `volt-api` URL (e.g. `https://volt-api-xyz.onrender.com`).
5. Update `baseUrl` in [`ApiClient.kt`](apps/mobile/app/src/main/java/com/volt/android/data/remote/ApiClient.kt#L17) with your live Render URL.
6. Rebuild the APK and distribute!

---

## 🧪 Testing

Run backend unit & integration tests:

```bash
# Routing Service Tests (60 test suites)
cd services/routing-service
npm test
```

---

## 📜 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
