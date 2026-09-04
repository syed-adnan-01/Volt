// ──────────────────────────────────────────────
// Vehicle Store (Zustand)
// Selected vehicle, vehicles list & simulated SoC.
// ──────────────────────────────────────────────

import { create } from 'zustand';
import { getVehicles, createVehicle, deleteVehicle, type Vehicle, type CreateVehicleInput } from '@/api/vehicles';
import { useAuthStore } from './authStore';

interface VehicleState {
  /** All user vehicles */
  vehicles: Vehicle[];
  /** Currently selected vehicle for trip planning */
  selectedVehicle: Vehicle | null;
  /**
   * Simulated state of charge (%).
   * Labeled as "simulated" in the UI per plan Section 8.1.
   */
  simulatedSoC: number;
  /** Loading state */
  loading: boolean;

  // Actions
  setVehicles: (vehicles: Vehicle[]) => void;
  selectVehicle: (vehicle: Vehicle | null) => void;
  setSimulatedSoC: (soc: number) => void;
  fetchVehicles: () => Promise<void>;
  addVehicle: (input: CreateVehicleInput) => Promise<boolean>;
  removeVehicle: (id: string) => Promise<boolean>;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  simulatedSoC: 80,
  loading: false,

  setVehicles: (vehicles) => set({ vehicles }),
  selectVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setSimulatedSoC: (soc) => set({ simulatedSoC: Math.max(0, Math.min(100, soc)) }),

  fetchVehicles: async () => {
    const isDemo = useAuthStore.getState().isDemo;
    if (isDemo) return;

    set({ loading: true });
    try {
      const res = await getVehicles();
      if (res.success && res.data) {
        set({ vehicles: res.data });
        if (!get().selectedVehicle && res.data.length > 0) {
          set({ selectedVehicle: res.data[0] });
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  addVehicle: async (input) => {
    const isDemo = useAuthStore.getState().isDemo;
    if (isDemo) {
      const newVehicle: Vehicle = {
        id: `demo-v-${Date.now()}`,
        user_id: 'demo-user-1',
        make: input.make,
        model: input.model,
        battery_capacity_kwh: input.battery_capacity_kwh,
        usable_capacity_kwh: input.usable_capacity_kwh,
        consumption_kwh_per_km: input.consumption_kwh_per_km,
        max_charging_power_kw: input.max_charging_power_kw,
        battery_health_percent: input.battery_health_percent ?? 100,
        reserve_soc_percent: input.reserve_soc_percent ?? 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        vehicles: [newVehicle, ...state.vehicles],
        selectedVehicle: newVehicle,
      }));
      return true;
    }

    const res = await createVehicle(input);
    if (res.success && res.data) {
      const added = res.data;
      set((state) => ({
        vehicles: [added, ...state.vehicles],
        selectedVehicle: added,
      }));
      return true;
    }
    return false;
  },

  removeVehicle: async (id) => {
    const isDemo = useAuthStore.getState().isDemo;
    if (isDemo) {
      set((state) => {
        const remaining = state.vehicles.filter((v) => v.id !== id);
        return {
          vehicles: remaining,
          selectedVehicle: state.selectedVehicle?.id === id ? remaining[0] || null : state.selectedVehicle,
        };
      });
      return true;
    }

    const res = await deleteVehicle(id);
    if (res.success) {
      set((state) => {
        const remaining = state.vehicles.filter((v) => v.id !== id);
        return {
          vehicles: remaining,
          selectedVehicle: state.selectedVehicle?.id === id ? remaining[0] || null : state.selectedVehicle,
        };
      });
      return true;
    }
    return false;
  },
}));
