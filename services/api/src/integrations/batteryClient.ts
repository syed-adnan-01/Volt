// ──────────────────────────────────────────────
// Battery Engine Client
// Communicates with Member 3's Battery API.
// ──────────────────────────────────────────────

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import type { BatteryResult } from '@volt/contracts';

export async function checkReachability(
  vehicleId: string,
  currentSoC: number,
  distanceKm: number
): Promise<BatteryResult> {
  const url = `${env.BATTERY_SERVICE_URL}/api/v1/simulate`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId, currentSoC, distanceKm }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Battery service responded with status ${response.status}`);
    }

    const data = await response.json();
    return data as BatteryResult;

  } catch (error: any) {
    clearTimeout(timeout);
    
    console.warn('⚠️ Battery service failed, using mock data for development.', error.message);
    
    // For development (Phase 2), we use a mock linear calculation
    // Assume 0.15 kWh/km efficiency and 82kWh battery capacity for the mock
    const energyRequiredKWh = distanceKm * 0.15;
    const socDrop = (energyRequiredKWh / 82) * 100;
    const arrivalSoC = currentSoC - socDrop;
    const reachable = arrivalSoC >= 10.0; // 10% reserve SoC assumption

    return {
      currentSoC,
      arrivalSoC: parseFloat(arrivalSoC.toFixed(2)),
      energyRequiredKWh: parseFloat(energyRequiredKWh.toFixed(2)),
      reachable,
      riskScore: reachable ? 0.1 : 0.9,
    };
  }
}
