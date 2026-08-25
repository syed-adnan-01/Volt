// ──────────────────────────────────────────────
// Auth Store (Zustand)
// Manages auth state, tokens, and user profile.
// Includes Demo Sign-In bypass for offline testing.
// ──────────────────────────────────────────────

import { create } from 'zustand';
import { getCurrentUser, updateProfile, type UserProfile, type UpdateProfileInput } from '@/api/auth';

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
  updateUserProfile: (input: UpdateProfileInput) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: 'demo-token-12345', // pre-authenticated with demo token for ease of use
  user: {
    id: 'demo-user-1',
    email: 'driver@volt.app',
    name: 'Adnan Syed (Demo Driver)',
    phone: '+1 555-0199',
    role: 'driver',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  isDemo: true,
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
        email: 'driver@volt.app',
        name: 'Adnan Syed (Demo Driver)',
        phone: '+1 555-0199',
        role: 'driver',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    get().fetchProfile();
  },

  fetchProfile: async () => {
    if (!get().token) return;
    try {
      const res = await getCurrentUser();
      if (res.success && res.data) {
        set({ user: res.data });
      }
    } catch {
      // Keep existing local user on network failure
    }
  },

  updateUserProfile: async (input) => {
    const res = await updateProfile(input);
    if (res.success && res.data) {
      set({ user: res.data });
      return true;
    }
    return false;
  },

  logout: () => set({ token: null, user: null, isDemo: false }),
}));
