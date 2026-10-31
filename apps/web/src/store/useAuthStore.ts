/**
 * Authentication and User Profile Store (Zustand)
 * Integrates with Supabase Auth with persistent session and demo persona presets.
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured, UserRole, UserProfile, DEMO_PROFILES } from '../lib/supabase';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isSupabaseConnected: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  loginAsDemo: (role: UserRole, patientId?: string, fullName?: string) => void;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, role: UserRole, fullName: string, patientId?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchPatientAccount: (patientId: string, patientName: string) => void;
}

const STORAGE_KEY = 'swasthya_auth_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isSupabaseConnected: isSupabaseConfigured,

  initializeAuth: async () => {
    // 1. Check local storage session first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        set({ user: parsed, isAuthenticated: true, isLoading: false });
        return;
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // 2. If real Supabase configured, check live session
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const userProfile: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              role: profile.role,
              full_name: profile.full_name,
              patient_id: profile.patient_id,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
            set({ user: userProfile, isAuthenticated: true, isLoading: false });
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase auth session lookup error:', err);
      }
    }

    // Default to Doctor demo persona on initial fresh visit for seamless hackathon review
    const defaultDoctor = DEMO_PROFILES.doctor;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDoctor));
    set({ user: defaultDoctor, isAuthenticated: true, isLoading: false });
  },

  loginAsDemo: (role: UserRole, patientId?: string, fullName?: string) => {
    const base = DEMO_PROFILES[role];
    const profile: UserProfile = {
      ...base,
      patient_id: patientId || base.patient_id,
      full_name: fullName || base.full_name,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    set({ user: profile, isAuthenticated: true, error: null });
  },

  switchPatientAccount: (patientId: string, patientName: string) => {
    const profile: UserProfile = {
      id: `usr-pat-${patientId.toLowerCase()}`,
      email: `patient.${patientId.toLowerCase()}@swasthya.internal`,
      role: 'patient',
      full_name: patientName,
      patient_id: patientId,
      avatar_url: DEMO_PROFILES.patient.avatar_url,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    set({ user: profile, isAuthenticated: true, error: null });
  },

  loginWithPassword: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    // Check demo credentials match
    for (const [role, demo] of Object.entries(DEMO_PROFILES)) {
      if (demo.email.toLowerCase() === email.toLowerCase() && (password === 'password' || password.length >= 6)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
        set({ user: demo, isAuthenticated: true, isLoading: false });
        return true;
      }
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email || '',
            role: (profile?.role as UserRole) || 'doctor',
            full_name: profile?.full_name || email.split('@')[0],
            patient_id: profile?.patient_id,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
          set({ user: userProfile, isAuthenticated: true, isLoading: false });
          return true;
        }
      } catch (err: any) {
        set({ error: err.message || 'Login failed', isLoading: false });
        return false;
      }
    }

    // Local fallback for custom email
    const inferredRole: UserRole = email.includes('lab')
      ? 'lab_technician'
      : email.includes('patient')
      ? 'patient'
      : 'doctor';

    const customUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      role: inferredRole,
      full_name: email.split('@')[0].toUpperCase(),
      patient_id: inferredRole === 'patient' ? 'PAT-0001' : undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customUser));
    set({ user: customUser, isAuthenticated: true, isLoading: false });
    return true;
  },

  signUp: async (
    email: string,
    password: string,
    role: UserRole,
    fullName: string,
    patientId?: string
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role, full_name: fullName, patient_id: patientId },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').insert([
            {
              id: data.user.id,
              email,
              role,
              full_name: fullName,
              patient_id: patientId,
            },
          ]);

          const userProfile: UserProfile = {
            id: data.user.id,
            email,
            role,
            full_name: fullName,
            patient_id: patientId,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
          set({ user: userProfile, isAuthenticated: true, isLoading: false });
          return true;
        }
      } catch (err: any) {
        set({ error: err.message || 'Sign up failed', isLoading: false });
        return false;
      }
    }

    // Local simulated profile creation
    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      role,
      full_name: fullName,
      patient_id: patientId || (role === 'patient' ? 'PAT-0001' : undefined),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    set({ user: newProfile, isAuthenticated: true, isLoading: false });
    return true;
  },

  logout: async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));
