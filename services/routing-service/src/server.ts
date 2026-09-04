import express from "express";
import type { Request, Response, Express } from "express";
import cors from "cors";
import { planEVRoute, rerouteEVRoute } from "./routePlanner.js";
import type { Location } from "./routePlanner.js";
import { DEFAULT_EV_VEHICLE } from "./models/evModel.js";
import type { EVVehicle } from "./models/evModel.js";
import type { OptimizationMode } from "./scoring/routeCost.js";

export function createServer(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // GET /health
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // POST /api/route/plan
  app.post("/api/route/plan", async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        origin,
        destination,
        ev,
        mode,
        connectorTypes,
        minPowerKw,
        blacklistedChargerIds,
        predictions,
        weights,
        returnAlternativesCount,
        maxDetourKm,
        optimizationTimeoutMs
      } = req.body || {};

      // 1. Validate Origin
      if (!origin || typeof origin !== "object") {
        res.status(400).json({ error: "Missing or invalid 'origin' object in request body." });
        return;
      }

      const originLat = Number(origin.lat);
      const originLon = Number(origin.lon);

      if (isNaN(originLat) || originLat < -90 || originLat > 90) {
        res.status(400).json({ error: "Invalid origin latitude. Must be a number between -90 and 90." });
        return;
      }

      if (isNaN(originLon) || originLon < -180 || originLon > 180) {
        res.status(400).json({ error: "Invalid origin longitude. Must be a number between -180 and 180." });
        return;
      }

      // 2. Validate Destination
      if (!destination || typeof destination !== "object") {
        res.status(400).json({ error: "Missing or invalid 'destination' object in request body." });
        return;
      }

      const destLat = Number(destination.lat);
      const destLon = Number(destination.lon);

      if (isNaN(destLat) || destLat < -90 || destLat > 90) {
        res.status(400).json({ error: "Invalid destination latitude. Must be a number between -90 and 90." });
        return;
      }

      if (isNaN(destLon) || destLon < -180 || destLon > 180) {
        res.status(400).json({ error: "Invalid destination longitude. Must be a number between -180 and 180." });
        return;
      }

      // 3. Validate Mode if provided
      const validModes: OptimizationMode[] = ["FASTEST", "MOST_RELIABLE", "MINIMUM_CHARGING", "BALANCED"];
      if (mode !== undefined && (typeof mode !== "string" || !validModes.includes(mode as OptimizationMode))) {
        res.status(400).json({ error: `Invalid 'mode'. Must be one of: ${validModes.join(", ")}.` });
        return;
      }

      // 4. Validate and construct EV parameters
      const evSpecs: EVVehicle = {
        batteryCapacityKwh: ev?.batteryCapacityKwh !== undefined ? Number(ev.batteryCapacityKwh) : DEFAULT_EV_VEHICLE.batteryCapacityKwh,
        consumptionKwhPerKm: ev?.consumptionKwhPerKm !== undefined ? Number(ev.consumptionKwhPerKm) : DEFAULT_EV_VEHICLE.consumptionKwhPerKm,
        initialSoCPct: ev?.initialSoCPct !== undefined ? Number(ev.initialSoCPct) : DEFAULT_EV_VEHICLE.initialSoCPct,
        minSoCBufferPct: ev?.minSoCBufferPct !== undefined ? Number(ev.minSoCBufferPct) : DEFAULT_EV_VEHICLE.minSoCBufferPct,
        chargingPowerKw: ev?.chargingPowerKw !== undefined ? Number(ev.chargingPowerKw) : DEFAULT_EV_VEHICLE.chargingPowerKw
      };

      if (isNaN(evSpecs.batteryCapacityKwh) || evSpecs.batteryCapacityKwh <= 0) {
        res.status(400).json({ error: "batteryCapacityKwh must be a positive number." });
        return;
      }

      if (isNaN(evSpecs.consumptionKwhPerKm) || evSpecs.consumptionKwhPerKm <= 0) {
        res.status(400).json({ error: "consumptionKwhPerKm must be a positive number." });
        return;
      }

      if (isNaN(evSpecs.initialSoCPct) || evSpecs.initialSoCPct < 0 || evSpecs.initialSoCPct > 100) {
        res.status(400).json({ error: "initialSoCPct must be a number between 0 and 100." });
        return;
      }

      if (isNaN(evSpecs.minSoCBufferPct) || evSpecs.minSoCBufferPct < 0 || evSpecs.minSoCBufferPct > 100) {
        res.status(400).json({ error: "minSoCBufferPct must be a number between 0 and 100." });
        return;
      }

      if (isNaN(evSpecs.chargingPowerKw) || evSpecs.chargingPowerKw <= 0) {
        res.status(400).json({ error: "chargingPowerKw must be a positive number." });
        return;
      }

      const originLoc: Location = {
        name: typeof origin.name === "string" && origin.name.trim() !== "" ? origin.name.trim() : "Origin",
        lat: originLat,
        lon: originLon
      };

      const destLoc: Location = {
        name: typeof destination.name === "string" && destination.name.trim() !== "" ? destination.name.trim() : "Destination",
        lat: destLat,
        lon: destLon
      };

      // 5. Calculate EV Route
      const routeResult = await planEVRoute(
        originLoc,
        destLoc,
        evSpecs,
        maxDetourKm !== undefined ? Number(maxDetourKm) : 10,
        undefined,
        predictions,
        weights,
        {
          mode: mode as OptimizationMode,
          connectorTypes: Array.isArray(connectorTypes) ? connectorTypes : undefined,
          minPowerKw: minPowerKw !== undefined ? Number(minPowerKw) : undefined,
          blacklistedChargerIds: Array.isArray(blacklistedChargerIds) ? blacklistedChargerIds : undefined,
          returnAlternativesCount: returnAlternativesCount !== undefined ? Number(returnAlternativesCount) : undefined,
          optimizationTimeoutMs: optimizationTimeoutMs !== undefined ? Number(optimizationTimeoutMs) : undefined
        }
      );

      res.json(routeResult);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Internal server error during route planning.";
      const statusCode = errorMessage.includes("cannot be reached") ? 422 : 500;
      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // POST /api/route/reroute
  app.post("/api/route/reroute", async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        currentLocation,
        destination,
        ev,
        mode,
        currentPlannedStops,
        blacklistedChargerIds,
        driverDeviated,
        previousTripDurationMinutes,
        previousRouteCost,
        previousSoCPct,
        minSoCChangePct,
        lastReroutedTimestampMs,
        cooldownMs,
        minCostImprovementPct,
        minEtaImprovementMinutes,
        predictions,
        weights,
        connectorTypes,
        minPowerKw,
        maxDetourKm,
        optimizationTimeoutMs
      } = req.body || {};

      // 1. Validate Current Location
      if (!currentLocation || typeof currentLocation !== "object") {
        res.status(400).json({ error: "Missing or invalid 'currentLocation' object in request body." });
        return;
      }

      const currLat = Number(currentLocation.lat);
      const currLon = Number(currentLocation.lon);

      if (isNaN(currLat) || currLat < -90 || currLat > 90) {
        res.status(400).json({ error: "Invalid currentLocation latitude. Must be a number between -90 and 90." });
        return;
      }

      if (isNaN(currLon) || currLon < -180 || currLon > 180) {
        res.status(400).json({ error: "Invalid currentLocation longitude. Must be a number between -180 and 180." });
        return;
      }

      // 2. Validate Destination
      if (!destination || typeof destination !== "object") {
        res.status(400).json({ error: "Missing or invalid 'destination' object in request body." });
        return;
      }

      const destLat = Number(destination.lat);
      const destLon = Number(destination.lon);

      if (isNaN(destLat) || destLat < -90 || destLat > 90) {
        res.status(400).json({ error: "Invalid destination latitude. Must be a number between -90 and 90." });
        return;
      }

      if (isNaN(destLon) || destLon < -180 || destLon > 180) {
        res.status(400).json({ error: "Invalid destination longitude. Must be a number between -180 and 180." });
        return;
      }

      // 3. Validate Mode if provided
      const validModes: OptimizationMode[] = ["FASTEST", "MOST_RELIABLE", "MINIMUM_CHARGING", "BALANCED"];
      if (mode !== undefined && (typeof mode !== "string" || !validModes.includes(mode as OptimizationMode))) {
        res.status(400).json({ error: `Invalid 'mode'. Must be one of: ${validModes.join(", ")}.` });
        return;
      }

      // 4. Validate EV Specs
      const evSpecs: EVVehicle = {
        batteryCapacityKwh: ev?.batteryCapacityKwh !== undefined ? Number(ev.batteryCapacityKwh) : DEFAULT_EV_VEHICLE.batteryCapacityKwh,
        consumptionKwhPerKm: ev?.consumptionKwhPerKm !== undefined ? Number(ev.consumptionKwhPerKm) : DEFAULT_EV_VEHICLE.consumptionKwhPerKm,
        initialSoCPct: ev?.initialSoCPct !== undefined ? Number(ev.initialSoCPct) : DEFAULT_EV_VEHICLE.initialSoCPct,
        minSoCBufferPct: ev?.minSoCBufferPct !== undefined ? Number(ev.minSoCBufferPct) : DEFAULT_EV_VEHICLE.minSoCBufferPct,
        chargingPowerKw: ev?.chargingPowerKw !== undefined ? Number(ev.chargingPowerKw) : DEFAULT_EV_VEHICLE.chargingPowerKw
      };

      if (isNaN(evSpecs.batteryCapacityKwh) || evSpecs.batteryCapacityKwh <= 0) {
        res.status(400).json({ error: "batteryCapacityKwh must be a positive number." });
        return;
      }

      if (isNaN(evSpecs.initialSoCPct) || evSpecs.initialSoCPct < 0 || evSpecs.initialSoCPct > 100) {
        res.status(400).json({ error: "initialSoCPct must be a number between 0 and 100." });
        return;
      }

      const currLocObj: Location = {
        name: typeof currentLocation.name === "string" && currentLocation.name.trim() !== "" ? currentLocation.name.trim() : "Current Location",
        lat: currLat,
        lon: currLon
      };

      const destLocObj: Location = {
        name: typeof destination.name === "string" && destination.name.trim() !== "" ? destination.name.trim() : "Destination",
        lat: destLat,
        lon: destLon
      };

      // 5. Execute Rerouting Optimization
      const rerouteResult = await rerouteEVRoute({
        currentLocation: currLocObj,
        destination: destLocObj,
        evProfile: evSpecs,
        predictions,
        weights,
        mode: mode as OptimizationMode,
        currentPlannedStops,
        blacklistedChargerIds: Array.isArray(blacklistedChargerIds) ? blacklistedChargerIds : undefined,
        driverDeviated: Boolean(driverDeviated),
        previousTripDurationMinutes: previousTripDurationMinutes !== undefined ? Number(previousTripDurationMinutes) : undefined,
        previousRouteCost: previousRouteCost !== undefined ? Number(previousRouteCost) : undefined,
        previousSoCPct: previousSoCPct !== undefined ? Number(previousSoCPct) : undefined,
        minSoCChangePct: minSoCChangePct !== undefined ? Number(minSoCChangePct) : undefined,
        lastReroutedTimestampMs: lastReroutedTimestampMs !== undefined ? Number(lastReroutedTimestampMs) : undefined,
        cooldownMs: cooldownMs !== undefined ? Number(cooldownMs) : undefined,
        minCostImprovementPct: minCostImprovementPct !== undefined ? Number(minCostImprovementPct) : undefined,
        minEtaImprovementMinutes: minEtaImprovementMinutes !== undefined ? Number(minEtaImprovementMinutes) : undefined,
        connectorTypes: Array.isArray(connectorTypes) ? connectorTypes : undefined,
        minPowerKw: minPowerKw !== undefined ? Number(minPowerKw) : undefined,
        maxDetourKm: maxDetourKm !== undefined ? Number(maxDetourKm) : undefined,
        optimizationTimeoutMs: optimizationTimeoutMs !== undefined ? Number(optimizationTimeoutMs) : undefined
      });

      res.json(rerouteResult);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Internal server error during rerouting.";
      const statusCode = errorMessage.includes("cannot be reached") ? 422 : 500;
      res.status(statusCode).json({ error: errorMessage });
    }
  });

  return app;
}

export function startServer(port: number = Number(process.env["PORT"]) || 3000) {
  const app = createServer();
  return app.listen(port, () => {
    console.log(`⚡ VOLT Routing Service API running on http://localhost:${port}`);
  });
}
