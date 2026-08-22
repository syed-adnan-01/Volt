// ──────────────────────────────────────────────
// Trip Store (Zustand)
// Active trip, current plan, route options,
// and reroute events.
// ──────────────────────────────────────────────

import { create } from 'zustand';
import type { TripPlan } from '@/api/trips';

type TripStatus = 'idle' | 'planning' | 'planned' | 'navigating' | 'completed';

interface RerouteEvent {
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

  // Actions
  setStatus: (status: TripStatus) => void;
  setActivePlan: (plan: TripPlan | null) => void;
  setRouteOptions: (options: TripPlan[]) => void;
  addRerouteEvent: (event: RerouteEvent) => void;
  clearRerouteEvents: () => void;
  reset: () => void;
}

export const useTripStore = create<TripState>((set) => ({
  status: 'idle',
  activePlan: null,
  routeOptions: [],
  rerouteEvents: [],

  setStatus: (status) => set({ status }),
  setActivePlan: (plan) => set({ activePlan: plan }),
  setRouteOptions: (options) => set({ routeOptions: options }),
  addRerouteEvent: (event) =>
    set((state) => ({ rerouteEvents: [...state.rerouteEvents, event] })),
  clearRerouteEvents: () => set({ rerouteEvents: [] }),
  reset: () =>
    set({
      status: 'idle',
      activePlan: null,
      routeOptions: [],
      rerouteEvents: [],
    }),
}));
