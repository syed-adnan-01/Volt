// ──────────────────────────────────────────────
// Database Seed Script
// Populates demo charging stations, vehicles, and initial status
// Usage: tsx src/db/seed.ts
// ──────────────────────────────────────────────

import { pool, closePool, query } from './client.js';

export async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding VOLT database with demo dataset...\n');

  // 1. Seed Demo User
  const userResult = await query(
    `INSERT INTO users (firebase_uid, email, name, phone, role)
     VALUES ($1, $2, $3, $4, 'USER')
     ON CONFLICT (firebase_uid) DO UPDATE SET updated_at = now()
     RETURNING id`,
    ['demo-user-1', 'driver@volt.app', 'Adnan Syed', '+1 555-0199']
  );
  const userId = userResult.rows[0].id;
  console.log(`  ✓ Demo User seeded: ${userId}`);

  // 2. Seed Demo Vehicles for User
  const vehicles = [
    {
      make: 'Tesla',
      model: 'Model 3 Long Range',
      battery_capacity_kwh: 75.0,
      usable_capacity_kwh: 72.0,
      consumption_kwh_per_km: 0.150,
      battery_health_percent: 97.4,
      reserve_soc_percent: 10.0,
      max_charging_power_kw: 250.0,
    },
    {
      make: 'Hyundai',
      model: 'Ioniq 5 Long Range',
      battery_capacity_kwh: 77.4,
      usable_capacity_kwh: 74.0,
      consumption_kwh_per_km: 0.168,
      battery_health_percent: 98.2,
      reserve_soc_percent: 10.0,
      max_charging_power_kw: 230.0,
    },
    {
      make: 'Porsche',
      model: 'Taycan 4S',
      battery_capacity_kwh: 93.4,
      usable_capacity_kwh: 88.0,
      consumption_kwh_per_km: 0.210,
      battery_health_percent: 96.1,
      reserve_soc_percent: 12.0,
      max_charging_power_kw: 270.0,
    },
    {
      make: 'Tata',
      model: 'Nexon EV Long Range',
      battery_capacity_kwh: 40.5,
      usable_capacity_kwh: 38.0,
      consumption_kwh_per_km: 0.135,
      battery_health_percent: 99.0,
      reserve_soc_percent: 10.0,
      max_charging_power_kw: 50.0,
    },
  ];

  for (const v of vehicles) {
    await query(
      `INSERT INTO vehicles (
         user_id, make, model, battery_capacity_kwh, usable_capacity_kwh,
         consumption_kwh_per_km, battery_health_percent, reserve_soc_percent, max_charging_power_kw
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        v.make,
        v.model,
        v.battery_capacity_kwh,
        v.usable_capacity_kwh,
        v.consumption_kwh_per_km,
        v.battery_health_percent,
        v.reserve_soc_percent,
        v.max_charging_power_kw,
      ]
    );
  }
  console.log(`  ✓ ${vehicles.length} Demo Vehicles seeded`);

  // 3. Seed Demo Charging Stations with PostGIS coordinates
  const stations = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'VOLT HyperCharge Gateway',
      operator: 'VOLT Grid',
      address: '1040 Innovation Pkwy, San Francisco, CA',
      lng: -122.4194,
      lat: 37.7749,
      connectors: [
        { type: 'CCS2', power: 350.0 },
        { type: 'NACS', power: 350.0 },
        { type: 'CCS2', power: 150.0 },
        { type: 'CCS2', power: 150.0 },
      ],
      available: 3,
      occupied: 1,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Electrify Station Express',
      operator: 'Electrify America',
      address: '450 Metro Boulevard, Oakland, CA',
      lng: -122.2711,
      lat: 37.8044,
      connectors: [
        { type: 'CCS2', power: 150.0 },
        { type: 'CHAdeMO', power: 50.0 },
      ],
      available: 1,
      occupied: 1,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Tesla Supercharger Hub',
      operator: 'Tesla Open Network',
      address: '780 Silicon Expressway, Palo Alto, CA',
      lng: -122.1430,
      lat: 37.4419,
      connectors: [
        { type: 'NACS', power: 250.0 },
        { type: 'NACS', power: 250.0 },
        { type: 'NACS', power: 250.0 },
        { type: 'CCS2', power: 250.0 },
      ],
      available: 4,
      occupied: 0,
    },
  ];

  for (const s of stations) {
    await query(
      `INSERT INTO charging_stations (id, name, operator, address, location, status)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 'active')
       ON CONFLICT (id) DO UPDATE SET updated_at = now()`,
      [s.id, s.name, s.operator, s.address, s.lng, s.lat]
    );

    for (const c of s.connectors) {
      await query(
        `INSERT INTO connectors (station_id, connector_type, power_kw, status)
         VALUES ($1, $2, $3, 'available')`,
        [s.id, c.type, c.power]
      );
    }

    await query(
      `INSERT INTO station_status (station_id, available_connectors, occupied_connectors, status, source)
       VALUES ($1, $2, $3, 'active', 'SYSTEM_OBSERVATION')`,
      [s.id, s.available, s.occupied]
    );
  }
  console.log(`  ✓ ${stations.length} Charging Stations, Connectors & Statuses seeded`);

  console.log('\n✅ Database seeding complete.\n');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    })
    .finally(() => closePool());
}
