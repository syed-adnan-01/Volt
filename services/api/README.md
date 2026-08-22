# VOLT API Gateway (Backend)

Welcome to the VOLT backend! This document provides instructions for the rest of the team (Members 2, 3, 4, 5) on how to get the API Gateway up and running locally.

## Prerequisites

- **Node.js** (LTS version, e.g., v20+)
- **PostgreSQL** (with **PostGIS** extension enabled)
- **Redis** (running locally or via Docker/Upstash)

## Setup Instructions

1. **Install Dependencies**
   From the `services/api` directory, run:
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` in the root of the project:
   ```bash
   cp ../../.env.example ../../.env
   ```
   *Make sure to fill in the missing values in `.env`, especially the `DATABASE_URL`, `REDIS_URL`, and the `FIREBASE_*` credentials which Member 1 will provide securely.*

3. **Database Migrations**
   We use `node-pg-migrate` or custom TS scripts for migrations. To set up your local database schema (which includes PostGIS, Users, Vehicles, Stations, and Trips), run:
   ```bash
   npm run db:migrate
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The API will start at `http://localhost:3000`.

## Verifying Setup

You can verify that your backend is correctly connected to the database and Redis by hitting the health check endpoint:

```bash
curl http://localhost:3000/health
```

You should see a standard response envelope like:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "connected",
    "redis": "connected",
    "timestamp": "2026-08-20T10:15:00Z"
  },
  "error": null,
  "meta": {
    "requestId": "req_8f21ac",
    "timestamp": "2026-08-20T10:15:00Z"
  }
}
```

## Architecture Notes
- **Authentication**: We use Firebase Authentication. Ensure you pass a valid Firebase ID Token as a `Bearer` token in the `Authorization` header for protected routes.
- **Service Integration**: The API Gateway coordinates calls between Battery, Charger, Routing, Prediction, and Optimizer services. Local URLs for these services are defined in your `.env` file.
