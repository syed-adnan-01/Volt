// ──────────────────────────────────────────────
// Indian EV Vehicle Catalog
// Pre-defined specs for popular EVs in India.
// Users select from this catalog to add vehicles.
// ──────────────────────────────────────────────

export interface EVCatalogEntry {
  /** Unique key for the catalog entry */
  key: string;
  /** Vehicle manufacturer */
  make: string;
  /** Vehicle model name */
  model: string;
  /** Display name shown in dropdowns */
  displayName: string;
  /** Total battery capacity in kWh */
  battery_capacity_kwh: number;
  /** Usable battery capacity in kWh */
  usable_capacity_kwh: number;
  /** Energy consumption in kWh per km */
  consumption_kwh_per_km: number;
  /** Maximum DC fast-charging power in kW */
  max_charging_power_kw: number;
  /** Category for grouping */
  category: 'sedan' | 'suv' | 'hatchback' | 'scooter' | 'mpv';
}

/**
 * Curated list of Indian-market EV models with realistic specs.
 * Sorted alphabetically by make → model.
 */
export const EV_CATALOG: EVCatalogEntry[] = [
  // ── Tata Motors ──────────────────────────────
  {
    key: 'tata-nexon-ev-max-lr',
    make: 'Tata',
    model: 'Nexon EV Max Long Range',
    displayName: 'Tata Nexon EV Max LR',
    battery_capacity_kwh: 40.5,
    usable_capacity_kwh: 38,
    consumption_kwh_per_km: 0.15,
    max_charging_power_kw: 50,
    category: 'suv',
  },
  {
    key: 'tata-nexon-ev-prime',
    make: 'Tata',
    model: 'Nexon EV Prime',
    displayName: 'Tata Nexon EV Prime',
    battery_capacity_kwh: 30.2,
    usable_capacity_kwh: 28,
    consumption_kwh_per_km: 0.14,
    max_charging_power_kw: 50,
    category: 'suv',
  },
  {
    key: 'tata-punch-ev',
    make: 'Tata',
    model: 'Punch EV',
    displayName: 'Tata Punch EV',
    battery_capacity_kwh: 35,
    usable_capacity_kwh: 33,
    consumption_kwh_per_km: 0.14,
    max_charging_power_kw: 50,
    category: 'suv',
  },
  {
    key: 'tata-punch-ev-adventure',
    make: 'Tata',
    model: 'Punch EV Adventure Long Range',
    displayName: 'Tata Punch EV Adventure LR',
    battery_capacity_kwh: 35,
    usable_capacity_kwh: 33,
    consumption_kwh_per_km: 0.13,
    max_charging_power_kw: 50,
    category: 'suv',
  },
  {
    key: 'tata-tiago-ev',
    make: 'Tata',
    model: 'Tiago EV',
    displayName: 'Tata Tiago EV',
    battery_capacity_kwh: 24,
    usable_capacity_kwh: 22,
    consumption_kwh_per_km: 0.12,
    max_charging_power_kw: 50,
    category: 'hatchback',
  },
  {
    key: 'tata-tigor-ev',
    make: 'Tata',
    model: 'Tigor EV',
    displayName: 'Tata Tigor EV',
    battery_capacity_kwh: 26,
    usable_capacity_kwh: 24,
    consumption_kwh_per_km: 0.12,
    max_charging_power_kw: 50,
    category: 'sedan',
  },
  {
    key: 'tata-curvv-ev',
    make: 'Tata',
    model: 'Curvv EV',
    displayName: 'Tata Curvv EV',
    battery_capacity_kwh: 55,
    usable_capacity_kwh: 52,
    consumption_kwh_per_km: 0.15,
    max_charging_power_kw: 70,
    category: 'suv',
  },
  {
    key: 'tata-harrier-ev',
    make: 'Tata',
    model: 'Harrier EV',
    displayName: 'Tata Harrier EV',
    battery_capacity_kwh: 75,
    usable_capacity_kwh: 71,
    consumption_kwh_per_km: 0.17,
    max_charging_power_kw: 140,
    category: 'suv',
  },

  // ── Mahindra ─────────────────────────────────
  {
    key: 'mahindra-xuv400-el',
    make: 'Mahindra',
    model: 'XUV400 EL',
    displayName: 'Mahindra XUV400 EL',
    battery_capacity_kwh: 34.5,
    usable_capacity_kwh: 32,
    consumption_kwh_per_km: 0.16,
    max_charging_power_kw: 50,
    category: 'suv',
  },
  {
    key: 'mahindra-xuv400-el-pro',
    make: 'Mahindra',
    model: 'XUV400 EL Pro',
    displayName: 'Mahindra XUV400 EL Pro',
    battery_capacity_kwh: 39.4,
    usable_capacity_kwh: 37,
    consumption_kwh_per_km: 0.16,
    max_charging_power_kw: 50,
    category: 'suv',
  },
  {
    key: 'mahindra-be6',
    make: 'Mahindra',
    model: 'BE 6',
    displayName: 'Mahindra BE 6',
    battery_capacity_kwh: 79,
    usable_capacity_kwh: 75,
    consumption_kwh_per_km: 0.16,
    max_charging_power_kw: 175,
    category: 'suv',
  },
  {
    key: 'mahindra-xe9',
    make: 'Mahindra',
    model: 'XEV 9e',
    displayName: 'Mahindra XEV 9e',
    battery_capacity_kwh: 79,
    usable_capacity_kwh: 75,
    consumption_kwh_per_km: 0.17,
    max_charging_power_kw: 175,
    category: 'suv',
  },

  // ── Hyundai ──────────────────────────────────
  {
    key: 'hyundai-ioniq5',
    make: 'Hyundai',
    model: 'IONIQ 5',
    displayName: 'Hyundai IONIQ 5',
    battery_capacity_kwh: 72.6,
    usable_capacity_kwh: 70,
    consumption_kwh_per_km: 0.17,
    max_charging_power_kw: 220,
    category: 'suv',
  },
  {
    key: 'hyundai-creta-ev',
    make: 'Hyundai',
    model: 'Creta Electric',
    displayName: 'Hyundai Creta Electric',
    battery_capacity_kwh: 51.4,
    usable_capacity_kwh: 48,
    consumption_kwh_per_km: 0.15,
    max_charging_power_kw: 100,
    category: 'suv',
  },
  {
    key: 'hyundai-kona-ev',
    make: 'Hyundai',
    model: 'Kona Electric',
    displayName: 'Hyundai Kona Electric',
    battery_capacity_kwh: 39.2,
    usable_capacity_kwh: 36,
    consumption_kwh_per_km: 0.15,
    max_charging_power_kw: 50,
    category: 'suv',
  },

  // ── Kia ──────────────────────────────────────
  {
    key: 'kia-ev6',
    make: 'Kia',
    model: 'EV6',
    displayName: 'Kia EV6',
    battery_capacity_kwh: 77.4,
    usable_capacity_kwh: 74,
    consumption_kwh_per_km: 0.17,
    max_charging_power_kw: 240,
    category: 'suv',
  },
  {
    key: 'kia-ev9',
    make: 'Kia',
    model: 'EV9',
    displayName: 'Kia EV9',
    battery_capacity_kwh: 99.8,
    usable_capacity_kwh: 96,
    consumption_kwh_per_km: 0.20,
    max_charging_power_kw: 250,
    category: 'suv',
  },

  // ── MG Motor ─────────────────────────────────
  {
    key: 'mg-zs-ev',
    make: 'MG',
    model: 'ZS EV',
    displayName: 'MG ZS EV',
    battery_capacity_kwh: 50.3,
    usable_capacity_kwh: 47,
    consumption_kwh_per_km: 0.17,
    max_charging_power_kw: 76,
    category: 'suv',
  },
  {
    key: 'mg-comet-ev',
    make: 'MG',
    model: 'Comet EV',
    displayName: 'MG Comet EV',
    battery_capacity_kwh: 17.3,
    usable_capacity_kwh: 16,
    consumption_kwh_per_km: 0.10,
    max_charging_power_kw: 30,
    category: 'hatchback',
  },
  {
    key: 'mg-windsor-ev',
    make: 'MG',
    model: 'Windsor EV',
    displayName: 'MG Windsor EV',
    battery_capacity_kwh: 38,
    usable_capacity_kwh: 36,
    consumption_kwh_per_km: 0.15,
    max_charging_power_kw: 50,
    category: 'mpv',
  },

  // ── BYD ──────────────────────────────────────
  {
    key: 'byd-atto3',
    make: 'BYD',
    model: 'Atto 3',
    displayName: 'BYD Atto 3',
    battery_capacity_kwh: 60.5,
    usable_capacity_kwh: 58,
    consumption_kwh_per_km: 0.18,
    max_charging_power_kw: 80,
    category: 'suv',
  },
  {
    key: 'byd-seal',
    make: 'BYD',
    model: 'Seal',
    displayName: 'BYD Seal',
    battery_capacity_kwh: 82.5,
    usable_capacity_kwh: 80,
    consumption_kwh_per_km: 0.16,
    max_charging_power_kw: 150,
    category: 'sedan',
  },
  {
    key: 'byd-e6',
    make: 'BYD',
    model: 'e6',
    displayName: 'BYD e6',
    battery_capacity_kwh: 71.7,
    usable_capacity_kwh: 68,
    consumption_kwh_per_km: 0.21,
    max_charging_power_kw: 60,
    category: 'mpv',
  },

  // ── Mercedes-Benz ────────────────────────────
  {
    key: 'mercedes-eqa',
    make: 'Mercedes-Benz',
    model: 'EQA 250+',
    displayName: 'Mercedes-Benz EQA',
    battery_capacity_kwh: 70.5,
    usable_capacity_kwh: 66,
    consumption_kwh_per_km: 0.19,
    max_charging_power_kw: 100,
    category: 'suv',
  },
  {
    key: 'mercedes-eqb',
    make: 'Mercedes-Benz',
    model: 'EQB 350',
    displayName: 'Mercedes-Benz EQB',
    battery_capacity_kwh: 70.5,
    usable_capacity_kwh: 66,
    consumption_kwh_per_km: 0.20,
    max_charging_power_kw: 100,
    category: 'suv',
  },
  {
    key: 'mercedes-eqs',
    make: 'Mercedes-Benz',
    model: 'EQS 580',
    displayName: 'Mercedes-Benz EQS',
    battery_capacity_kwh: 107.8,
    usable_capacity_kwh: 104,
    consumption_kwh_per_km: 0.21,
    max_charging_power_kw: 200,
    category: 'sedan',
  },

  // ── BMW ──────────────────────────────────────
  {
    key: 'bmw-ix1',
    make: 'BMW',
    model: 'iX1 xDrive30',
    displayName: 'BMW iX1',
    battery_capacity_kwh: 66.5,
    usable_capacity_kwh: 64,
    consumption_kwh_per_km: 0.18,
    max_charging_power_kw: 130,
    category: 'suv',
  },
  {
    key: 'bmw-i4',
    make: 'BMW',
    model: 'i4 eDrive40',
    displayName: 'BMW i4',
    battery_capacity_kwh: 83.9,
    usable_capacity_kwh: 80,
    consumption_kwh_per_km: 0.18,
    max_charging_power_kw: 200,
    category: 'sedan',
  },
  {
    key: 'bmw-i7',
    make: 'BMW',
    model: 'i7 xDrive60',
    displayName: 'BMW i7',
    battery_capacity_kwh: 101.7,
    usable_capacity_kwh: 98,
    consumption_kwh_per_km: 0.22,
    max_charging_power_kw: 195,
    category: 'sedan',
  },

  // ── Audi ─────────────────────────────────────
  {
    key: 'audi-q8-etron',
    make: 'Audi',
    model: 'Q8 e-tron',
    displayName: 'Audi Q8 e-tron',
    battery_capacity_kwh: 114,
    usable_capacity_kwh: 106,
    consumption_kwh_per_km: 0.24,
    max_charging_power_kw: 170,
    category: 'suv',
  },
  {
    key: 'audi-etron-gt',
    make: 'Audi',
    model: 'e-tron GT',
    displayName: 'Audi e-tron GT',
    battery_capacity_kwh: 93.4,
    usable_capacity_kwh: 85,
    consumption_kwh_per_km: 0.21,
    max_charging_power_kw: 270,
    category: 'sedan',
  },

  // ── Volvo ────────────────────────────────────
  {
    key: 'volvo-xc40-recharge',
    make: 'Volvo',
    model: 'XC40 Recharge',
    displayName: 'Volvo XC40 Recharge',
    battery_capacity_kwh: 78,
    usable_capacity_kwh: 75,
    consumption_kwh_per_km: 0.20,
    max_charging_power_kw: 150,
    category: 'suv',
  },
  {
    key: 'volvo-c40-recharge',
    make: 'Volvo',
    model: 'C40 Recharge',
    displayName: 'Volvo C40 Recharge',
    battery_capacity_kwh: 78,
    usable_capacity_kwh: 75,
    consumption_kwh_per_km: 0.19,
    max_charging_power_kw: 150,
    category: 'suv',
  },

  // ── Citroen ──────────────────────────────────
  {
    key: 'citroen-ec3',
    make: 'Citroën',
    model: 'ëC3',
    displayName: 'Citroën ëC3',
    battery_capacity_kwh: 29.2,
    usable_capacity_kwh: 27,
    consumption_kwh_per_km: 0.14,
    max_charging_power_kw: 50,
    category: 'hatchback',
  },
  {
    key: 'citroen-ebasalt',
    make: 'Citroën',
    model: 'ë-Basalt',
    displayName: 'Citroën ë-Basalt',
    battery_capacity_kwh: 29.2,
    usable_capacity_kwh: 27,
    consumption_kwh_per_km: 0.14,
    max_charging_power_kw: 50,
    category: 'suv',
  },

  // ── Ola Electric ─────────────────────────────
  {
    key: 'ola-s1-pro',
    make: 'Ola Electric',
    model: 'S1 Pro',
    displayName: 'Ola S1 Pro (Scooter)',
    battery_capacity_kwh: 3.97,
    usable_capacity_kwh: 3.7,
    consumption_kwh_per_km: 0.04,
    max_charging_power_kw: 4,
    category: 'scooter',
  },
  {
    key: 'ola-s1-air',
    make: 'Ola Electric',
    model: 'S1 Air',
    displayName: 'Ola S1 Air (Scooter)',
    battery_capacity_kwh: 2.5,
    usable_capacity_kwh: 2.3,
    consumption_kwh_per_km: 0.03,
    max_charging_power_kw: 4,
    category: 'scooter',
  },

  // ── Ather Energy ─────────────────────────────
  {
    key: 'ather-450x',
    make: 'Ather',
    model: '450X Gen 3',
    displayName: 'Ather 450X (Scooter)',
    battery_capacity_kwh: 3.7,
    usable_capacity_kwh: 3.4,
    consumption_kwh_per_km: 0.04,
    max_charging_power_kw: 3,
    category: 'scooter',
  },
  {
    key: 'ather-rizta',
    make: 'Ather',
    model: 'Rizta',
    displayName: 'Ather Rizta (Scooter)',
    battery_capacity_kwh: 3.7,
    usable_capacity_kwh: 3.4,
    consumption_kwh_per_km: 0.04,
    max_charging_power_kw: 3,
    category: 'scooter',
  },
];

/** Get unique makes for filtering */
export function getUniqueMakes(): string[] {
  return [...new Set(EV_CATALOG.map((ev) => ev.make))].sort();
}

/** Get models filtered by make */
export function getModelsByMake(make: string): EVCatalogEntry[] {
  return EV_CATALOG.filter((ev) => ev.make === make);
}

/** Get a catalog entry by key */
export function getCatalogEntry(key: string): EVCatalogEntry | undefined {
  return EV_CATALOG.find((ev) => ev.key === key);
}

/** Category emoji mapping */
export function getCategoryEmoji(category: EVCatalogEntry['category']): string {
  switch (category) {
    case 'sedan':
      return '🚗';
    case 'suv':
      return '🚙';
    case 'hatchback':
      return '🚘';
    case 'scooter':
      return '🛵';
    case 'mpv':
      return '🚐';
    default:
      return '⚡';
  }
}
