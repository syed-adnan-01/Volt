# VOLT API Gateway Documentation

## Base Specification
- **Protocol:** HTTPS / HTTP REST
- **Authentication:** Firebase ID Token (`Authorization: Bearer <firebase-id-token>`)
- **Default Host:** `http://localhost:3000`

---

## 1. Response Envelope Format

All API responses follow the standard VOLT JSON envelope:

### Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "requestId": "req_1234567890",
    "timestamp": "2026-09-02T11:00:00.000Z"
  }
}
```

### Error Response (`400`, `401`, `403`, `404`, `429`, `500`)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_INVALID",
    "message": "Invalid or expired token."
  },
  "meta": {
    "requestId": "req_1234567890",
    "timestamp": "2026-09-02T11:00:00.000Z"
  }
}
```

---

## 2. Core Endpoints Reference

### Health Probes
* `GET /health`: Probes PostgreSQL database pool and Redis connection latencies. Returns `200 OK` (healthy) or `503 Service Unavailable` (degraded).

### User Management & Push Notifications
* `GET /users/me`: Fetches the authenticated user profile.
* `PATCH /users/me`: Updates profile details (name, phone).
* `POST /users/me/device-token`: Registers/updates the user's FCM device token (`{ fcm_token: string, platform: 'android' | 'ios' | 'web' }`).
* `DELETE /users/me/device-token`: Unregisters an FCM device token on logout (`{ fcm_token: string }`).

### Push Notification Triggers (Server Dispatch)
The API Gateway dispatches real-time alerts to registered Android devices via FCM:
- `TRIP_PLAN_READY`: Optimized multi-stop route generated.
- `REROUTE_RECOMMENDED`: Faster charger or lower wait-time station available.
- `LOW_BATTERY_WARNING`: Battery dropped below safe reserve buffer.
- `FEEDBACK_PROMPT`: Post-charge prompt to rate station reliability.

### Vehicles Management
* `GET /vehicles`: Lists all vehicles owned by the authenticated user.
* `GET /vehicles/:id`: Fetches a single vehicle profile owned by the authenticated user.
* `POST /vehicles`: Registers a new EV profile (make, model, capacity, Wh/km consumption, max charging power).
* `PATCH /vehicles/:id`: Updates an existing vehicle profile.
* `DELETE /vehicles/:id`: Deletes a vehicle profile.

### Charging Stations & Feedback
* `GET /stations?lat={lat}&lng={lng}&radiusKm={r}`: Proximity spatial search using PostGIS `ST_DWithin`.
* `GET /stations/:id`: Station metadata lookup.
* `GET /stations/:id/status`: Real-time status lookup.
* `GET /stations/:id/predictions`: Machine learning availability and wait-time predictions.
* `POST /stations/:id/feedback`: Submits driver observations and plug status feedback.

### Multi-Stop Trip Orchestration
* `POST /trips`: Full multi-stop trip planner (coordinates OSRM routing, battery reachability, station search, ML prediction, and trip optimization; persists `trips` and `trip_stops`).
* `GET /trips/:id`: Retrieves trip details and sequence of charging stops.
* `POST /trips/:id/reroute`: Triggers real-time route optimization update.
* `PATCH /trips/:id/status`: Updates trip execution state (`planned`, `in_progress`, `completed`).

---

## 3. Standard Error Codes

| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `AUTH_REQUIRED` | 401 | Missing Authorization header |
| `AUTH_INVALID` | 401 | Invalid or expired Firebase token |
| `FORBIDDEN` | 403 | Resource not owned by user |
| `VEHICLE_NOT_FOUND` | 404 | Specified vehicle ID does not exist |
| `NOT_FOUND` | 404 | Resource not found |
| `INSUFFICIENT_BATTERY` | 422 | Route unreachable even with charging stops |
| `RATE_LIMIT_EXCEEDED` | 429 | Exceeded 100 requests per minute limit |
| `SERVICE_DEGRADED` | 503 | Database or Redis probe failed |
