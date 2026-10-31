import { create } from 'zustand';

export type UserRole = 'patient' | 'health_worker' | 'clinician' | 'supervisor' | 'admin';

export interface AppUser {
  id: string;
  role: UserRole;
  displayName: string;
  preferredLanguage: string;
  maskedId: string;
}

interface AppState {
  theme: 'light' | 'dark';
  user: AppUser | null;
  isAuthenticated: boolean;
  offlineMode: boolean;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setUser: (user: AppUser | null) => void;
  setOfflineMode: (offline: boolean) => void;
  signOut: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'dark',
  user: null,
  isAuthenticated: false,
  offlineMode: false,

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setOfflineMode: (offlineMode) => {
    set({ offlineMode });
  },

  signOut: () => {
    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));
