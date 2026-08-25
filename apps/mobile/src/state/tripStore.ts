// ──────────────────────────────────────────────
// Trip Store (Zustand)
// Active trip, current plan, route options,
// and reroute events.
// ──────────────────────────────────────────────

import { create } from 'zustand';
import { planTrip, rerouteTrip, updateTripStatus, type TripPlan } from '@/api/trips';
import { useVehicleStore } from './vehicleStore';
import { useAuthStore } from './authStore';

export type TripStatus = 'idle' | 'planning' | 'planned' | 'navigating' | 'completed';

export interface RerouteEvent {
  message: string;
  timeSavedMinutes: number | null; // null = backend didn't provide
  newStationId: string;
  timestamp: string;
}

interface TripState {
  /** Current trip status */
  status: TripStatus;
  /** Active trip plan */
  activePlan: TripPlan | null;
  /** All candidate route options from the optimizer */
  routeOptions: TripPlan[];
  /** Reroute events received during navigation */
  rerouteEvents: RerouteEvent[];
  /** Loading state for planning/actions */
  loading: boolean;
  /** Error message if any */
  error: string | null;

  // Actions
  setStatus: (status: TripStatus) => void;
  setActivePlan: (plan: TripPlan | null) => void;
  setRouteOptions: (options: TripPlan[]) => void;
  addRerouteEvent: (event: RerouteEvent) => void;
  clearRerouteEvents: () => void;
  planTripAction: (
    destLat?: number,
    destLng?: number,
    destName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  startNavigation: () => Promise<void>;
  triggerReroute: () => Promise<void>;
  completeTrip: () => Promise<void>;
  reset: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  status: 'idle',
  activePlan: null,
  routeOptions: [],
  rerouteEvents: [],
  loading: false,
  error: null,

  setStatus: (status) => set({ status }),
  setActivePlan: (plan) => set({ activePlan: plan }),
  setRouteOptions: (options) => set({ routeOptions: options }),
  addRerouteEvent: (event) =>
    set((state) => ({ rerouteEvents: [...state.rerouteEvents, event] })),
  clearRerouteEvents: () => set({ rerouteEvents: [] }),

  planTripAction: async (destLat = 18.5204, destLng = 73.8567, destName = 'Pune') => {
    const { selectedVehicle, simulatedSoC } = useVehicleStore.getState();
    const isDemo = useAuthStore.getState().isDemo;

    if (!selectedVehicle) {
      return { success: false, error: 'Please select or add an EV vehicle first.' };
    }

    set({ loading: true, error: null, status: 'planning' });

    // Mumbai default origin (19.0760, 72.8777)
    const origin_lat = 19.076;
    const origin_lng = 72.8777;

    try {
      const response = await planTrip({
        vehicle_id: selectedVehicle.id,
        current_soc: simulatedSoC,
        origin_lat,
        origin_lng,
        dest_lat: destLat,
        dest_lng: destLng,
      });

      if (response.success && response.data) {
        const plan = response.data;
        // Generate alternative option for route selection UI
        const alternativePlan: TripPlan = {
          ...plan,
          tripId: `${plan.tripId}-alt`,
          distanceKm: parseFloat((plan.distanceKm * 1.15).toFixed(1)),
          durationMinutes: Math.round(plan.durationMinutes * 1.25),
        };

        set({
          activePlan: plan,
          routeOptions: [plan, alternativePlan],
          status: 'planned',
          loading: false,
        });
        return { success: true };
      } else {
        const errMsg = response.error?.message || 'Failed to plan trip with backend.';
        set({ error: errMsg, loading: false, status: 'idle' });
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during trip planning.';
      set({ error: errMsg, loading: false, status: 'idle' });
      return { success: false, error: errMsg };
    }
  },

  startNavigation: async () => {
    const { activePlan } = get();
    if (activePlan) {
      set({ status: 'navigating' });
      await updateTripStatus(activePlan.tripId, 'in_progress').catch(() => {});
    }
  },

  triggerReroute: async () => {
    const { activePlan } = get();
    if (!activePlan) return;

    const res = await rerouteTrip(activePlan.tripId);
    if (res.success) {
      get().addRerouteEvent({
        message: '⚡ Faster charger recommended ahead. 12 mins saved!',
        timeSavedMinutes: 12,
        newStationId: 'mock-station-1',
        timestamp: new Date().toISOString(),
      });
    }
  },

  completeTrip: async () => {
    const { activePlan } = get();
    if (activePlan) {
      await updateTripStatus(activePlan.tripId, 'completed').catch(() => {});
    }
    set({
      status: 'completed',
      activePlan: null,
      routeOptions: [],
      rerouteEvents: [],
    });
  },

  reset: () =>
    set({
      status: 'idle',
      activePlan: null,
      routeOptions: [],
      rerouteEvents: [],
      error: null,
      loading: false,
    }),
}));
