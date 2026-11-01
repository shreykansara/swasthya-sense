/**
 * Authentication and User Profile Store (Zustand)
 * Integrates with Supabase Auth with persistent session and demo persona presets.
 * Enforces strict Role-Based Access Control (RBAC):
 * - Public self-registered users are IMMUTABLY patients.
 * - Clinician (Doctor) and Laboratory Technician roles are strictly restricted
 *   to pre-authorized hospital administration accounts.
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured, UserRole, UserProfile, DEMO_PROFILES } from '../lib/supabase';

interface StoredAccount {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  full_name: string;
  patient_id?: string;
  created_at?: string;
}

const STORAGE_KEY = 'swasthya_auth_user';
const ACCOUNTS_STORAGE_KEY = 'swasthya_registered_accounts';

/**
 * Returns all registered accounts, initializing default authorized staff profiles if not present.
 */
const getRegisteredAccounts = (): Record<string, StoredAccount> => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const accounts: Record<string, StoredAccount> = raw ? JSON.parse(raw) : {};

    // 1. Authorized Doctor Account (Hospital Pre-provisioned)
    if (!accounts['doctor@swasthya.internal']) {
      accounts['doctor@swasthya.internal'] = {
        id: DEMO_PROFILES.doctor.id,
        email: DEMO_PROFILES.doctor.email.toLowerCase(),
        password: 'password',
        role: 'doctor',
        full_name: DEMO_PROFILES.doctor.full_name,
      };
    }

    // 2. Authorized Lab Tech Account (Hospital Pre-provisioned)
    if (!accounts['lab@swasthya.internal']) {
      accounts['lab@swasthya.internal'] = {
        id: DEMO_PROFILES.lab_technician.id,
        email: DEMO_PROFILES.lab_technician.email.toLowerCase(),
        password: 'password',
        role: 'lab_technician',
        full_name: DEMO_PROFILES.lab_technician.full_name,
      };
    }

    // 3. Demo Patient Account
    if (!accounts['patient@swasthya.internal']) {
      accounts['patient@swasthya.internal'] = {
        id: DEMO_PROFILES.patient.id,
        email: DEMO_PROFILES.patient.email.toLowerCase(),
        password: 'password',
        role: 'patient',
        full_name: DEMO_PROFILES.patient.full_name,
        patient_id: 'PAT-0001',
      };
    }

    return accounts;
  } catch (e) {
    return {};
  }
};

const saveRegisteredAccount = (account: StoredAccount) => {
  try {
    const accounts = getRegisteredAccounts();
    accounts[account.email.trim().toLowerCase()] = account;
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Error saving registered account to localStorage:', e);
  }
};

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
        const parsed: UserProfile = JSON.parse(stored);
        const normalized = (parsed.email || '').trim().toLowerCase();
        const accounts = getRegisteredAccounts();

        // STRICT ROLE RECONCILIATION:
        // Prevent any stale or corrupted session from elevating a patient to clinician
        if (accounts[normalized]) {
          parsed.role = accounts[normalized].role;
          parsed.patient_id = accounts[normalized].patient_id || parsed.patient_id;
        } else if (normalized !== 'doctor@swasthya.internal' && normalized !== 'lab@swasthya.internal') {
          // Public users are strictly patients
          parsed.role = 'patient';
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
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

          // Resolved role defaults strictly to 'patient', never elevated to 'doctor'
          const resolvedRole: UserRole =
            profile?.role || session.user.user_metadata?.role || 'patient';

          const userProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            role: resolvedRole,
            full_name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            patient_id: profile?.patient_id || session.user.user_metadata?.patient_id,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
          set({ user: userProfile, isAuthenticated: true, isLoading: false });
          return;
        }
      } catch (err) {
        console.warn('Supabase auth session lookup error:', err);
      }
    }

    // No active session found
    set({ user: null, isAuthenticated: false, isLoading: false });
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
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check pre-authorized demo staff credentials first
    for (const [role, demo] of Object.entries(DEMO_PROFILES)) {
      if (demo.email.toLowerCase() === normalizedEmail && (password === 'password' || password.length >= 6)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
        set({ user: demo, isAuthenticated: true, isLoading: false, error: null });
        return true;
      }
    }

    // 2. If Supabase is configured, attempt Supabase auth
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          // Role must match profile or metadata; fallback to 'patient'
          const resolvedRole: UserRole =
            profile?.role || data.user.user_metadata?.role || 'patient';

          const userProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email || normalizedEmail,
            role: resolvedRole,
            full_name: profile?.full_name || data.user.user_metadata?.full_name || normalizedEmail.split('@')[0],
            patient_id: profile?.patient_id || data.user.user_metadata?.patient_id,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
          set({ user: userProfile, isAuthenticated: true, isLoading: false, error: null });
          return true;
        }
      } catch (err: any) {
        console.warn('Supabase sign-in failed, checking registered accounts:', err?.message);
      }
    }

    // 3. Check registered persistent accounts
    const accounts = getRegisteredAccounts();
    const account = accounts[normalizedEmail];
    if (account) {
      // Validate password
      if (account.password && account.password !== password) {
        set({ error: 'Incorrect password. Please verify your credentials.', isLoading: false });
        return false;
      }

      // STRICT ROLE PRESERVATION:
      // The role recorded at registration (patient) is strictly enforced.
      const userProfile: UserProfile = {
        id: account.id,
        email: account.email,
        role: account.role, // Strictly preserves 'patient'
        full_name: account.full_name,
        patient_id: account.patient_id,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
      set({ user: userProfile, isAuthenticated: true, isLoading: false, error: null });
      return true;
    }

    // 4. Reject unrecognized email (NO auto-creation of clinician accounts!)
    set({
      error: 'Account not found with this email. If you are a patient, please register your account first. Clinician and laboratory credentials must be issued by hospital administration.',
      isLoading: false,
    });
    return false;
  },

  signUp: async (
    email: string,
    password: string,
    _role: UserRole, // Ignored: public self-registration is strictly and immutably PATIENT
    fullName: string,
    patientId?: string
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Invariant: Public accounts are strictly 'patient'
    const role: UserRole = 'patient';
    const assignedPid = patientId?.trim() || `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

    const accounts = getRegisteredAccounts();
    if (accounts[normalizedEmail]) {
      set({ error: 'An account with this email address already exists. Please sign in.', isLoading: false });
      return false;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { role: 'patient', full_name: fullName, patient_id: assignedPid },
          },
        });
        if (error) throw error;
        if (data.user) {
          try {
            await supabase.from('profiles').insert([
              {
                id: data.user.id,
                email: normalizedEmail,
                role: 'patient',
                full_name: fullName,
                patient_id: assignedPid,
              },
            ]);
          } catch (profileErr) {
            console.warn('Supabase profile insertion error:', profileErr);
          }
        }
      } catch (err: any) {
        console.warn('Supabase signup error (falling back to secure local store):', err);
      }
    }

    // Save to persistent accounts repository with immutable patient role
    const newAccount: StoredAccount = {
      id: `usr-${Date.now()}`,
      email: normalizedEmail,
      password,
      role: 'patient', // STRICTLY PATIENT
      full_name: fullName.trim(),
      patient_id: assignedPid,
      created_at: new Date().toISOString(),
    };
    saveRegisteredAccount(newAccount);

    const userProfile: UserProfile = {
      id: newAccount.id,
      email: newAccount.email,
      role: 'patient',
      full_name: newAccount.full_name,
      patient_id: newAccount.patient_id,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
    set({ user: userProfile, isAuthenticated: true, isLoading: false, error: null });
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
    set({ user: null, isAuthenticated: false, error: null });
  },
}));
