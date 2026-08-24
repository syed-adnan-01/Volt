// ──────────────────────────────────────────────
// Auth Store (Zustand)
// Manages auth state, tokens, and user profile.
// Includes Demo Sign-In bypass for offline testing.
// ──────────────────────────────────────────────

import { create } from 'zustand';
import { getCurrentUser, type UserProfile } from '@/api/auth';

interface AuthState {
  /** Auth token for API requests */
  token: string | null;
  /** Current user profile from the backend */
  user: UserProfile | null;
  /** Whether Demo Mode is active */
  isDemo: boolean;
  /** Whether the auth state has been initialized */
  initialized: boolean;

  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  demoLogin: () => void;
  fetchProfile: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isDemo: false,
  initialized: true,

  setToken: (token) => set({ token, isDemo: false }),
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),

  demoLogin: () => {
    set({
      token: 'demo-token-12345',
      isDemo: true,
      user: {
        id: 'demo-user-1',
        email: 'demo@volt.app',
        name: 'Adnan Syed (Demo Driver)',
        phone: '+1 555-0199',
        role: 'driver',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  },

  fetchProfile: async () => {
    if (get().isDemo || !get().token) return;
    const res = await getCurrentUser();
    if (res.success && res.data) {
      set({ user: res.data });
    }
  },

  logout: () => set({ token: null, user: null, isDemo: false }),
}));
