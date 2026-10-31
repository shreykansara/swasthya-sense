import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppRole = 'patient' | 'health_worker' | 'clinician' | 'supervisor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: AppRole;
  displayName: string;
  preferredLanguage: string;
  maskedId: string;
}

export const DEMO_USERS: Record<AppRole, UserProfile> = {
  patient: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'patient@swasthya.test',
    role: 'patient',
    displayName: 'Aarav Sharma',
    preferredLanguage: 'hi',
    maskedId: 'PT-9821',
  },
  health_worker: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'worker@swasthya.test',
    role: 'health_worker',
    displayName: 'Pooja Devi (ASHA)',
    preferredLanguage: 'hi',
    maskedId: 'HW-4102',
  },
  clinician: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'clinician@swasthya.test',
    role: 'clinician',
    displayName: 'Dr. Ramesh Patel (MD)',
    preferredLanguage: 'en',
    maskedId: 'CL-1044',
  },
  supervisor: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'supervisor@swasthya.test',
    role: 'supervisor',
    displayName: 'Sunita Rao (PHC Sup)',
    preferredLanguage: 'en',
    maskedId: 'SV-0301',
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'admin@swasthya.test',
    role: 'admin',
    displayName: 'System Admin',
    preferredLanguage: 'en',
    maskedId: 'AD-0001',
  },
};

export const ROLE_HOME_PATHS: Record<AppRole, string> = {
  patient: '/patient',
  health_worker: '/worker',
  clinician: '/clinician',
  supervisor: '/supervisor',
  admin: '/admin',
};

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signInDemoRole: (role: AppRole) => void;
  signIn: (email: string, password?: string) => Promise<boolean>;
  signOut: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signInDemoRole: (role: AppRole) => {
        const demoProfile = DEMO_USERS[role];
        set({
          user: demoProfile,
          token: `demo-token-${role}`,
          isAuthenticated: true,
          error: null,
        });
      },

      signIn: async (email: string) => {
        set({ isLoading: true, error: null });
        const matched = Object.values(DEMO_USERS).find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );

        if (matched) {
          set({
            user: matched,
            token: `demo-token-${matched.role}`,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }

        set({
          isLoading: false,
          error: 'User not found. Use one of the 5 demo role profiles below.',
        });
        return false;
      },

      signOut: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'swasthya-sense-auth-v1',
    }
  )
);
