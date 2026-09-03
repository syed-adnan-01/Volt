import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "http";
import { createServer } from "../server.js";

describe("REST API Server Tests", () => {
  let server: Server;
  const PORT = 3099; // Test port
  const BASE_URL = `http://localhost:${PORT}`;

  before(() => {
    return new Promise<void>((resolve) => {
      const app = createServer();
      server = app.listen(PORT, () => {
        resolve();
      });
    });
  });

  after(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  test("GET /health returns 200 OK with status ok", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as { status: string };
    assert.equal(data.status, "ok");
  });

  test("POST /api/route/plan returns 200 for valid route request", async () => {
    const payload = {
      origin: { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
      destination: { name: "Mysuru", lat: 12.2958, lon: 76.6394 },
      ev: {
        batteryCapacityKwh: 60,
        consumptionKwhPerKm: 0.15,
        initialSoCPct: 100,
        minSoCBufferPct: 20,
        chargingPowerKw: 60
      }
    };

    const res = await fetch(`${BASE_URL}/api/route/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as { totalDistanceKm: number; stops: unknown[] };
    assert.ok(data.totalDistanceKm > 0);
    assert.equal(data.stops.length, 0);
  });

  test("POST /api/route/plan returns 400 for invalid coordinates", async () => {
    const payload = {
      origin: { lat: 999, lon: 77.5946 }, // Invalid lat
      destination: { lat: 12.2958, lon: 76.6394 }
    };

    const res = await fetch(`${BASE_URL}/api/route/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const data = (await res.json()) as { error: string };
    assert.ok(data.error.includes("Invalid origin latitude"));
  });

  test("POST /api/route/plan returns 400 for invalid EV parameters", async () => {
    const payload = {
      origin: { lat: 12.9716, lon: 77.5946 },
      destination: { lat: 12.2958, lon: 76.6394 },
      ev: {
        batteryCapacityKwh: -50 // Invalid negative capacity
      }
    };

    const res = await fetch(`${BASE_URL}/api/route/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const data = (await res.json()) as { error: string };
    assert.ok(data.error.includes("batteryCapacityKwh must be a positive number"));
  });
});
