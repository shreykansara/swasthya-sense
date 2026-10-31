import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';

describe('useAuthStore & RBAC logic', () => {
  beforeEach(() => {
    useAuthStore.getState().signOut();
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('signs in as patient demo role', () => {
    useAuthStore.getState().signInDemoRole('patient');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.role).toBe('patient');
    expect(state.user?.maskedId).toBe('PT-9821');
  });

  it('signs in as clinician demo role', () => {
    useAuthStore.getState().signInDemoRole('clinician');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.role).toBe('clinician');
    expect(state.user?.displayName).toContain('Dr.');
  });

  it('signs in as health worker demo role', () => {
    useAuthStore.getState().signInDemoRole('health_worker');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.role).toBe('health_worker');
  });

  it('signs in via email matching demo user', async () => {
    const success = await useAuthStore.getState().signIn('admin@swasthya.test');
    expect(success).toBe(true);
    const state = useAuthStore.getState();
    expect(state.user?.role).toBe('admin');
  });

  it('fails with invalid email', async () => {
    const success = await useAuthStore.getState().signIn('unknown@invalid.test');
    expect(success).toBe(false);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeTruthy();
  });

  it('sign-out clears user and token', () => {
    useAuthStore.getState().signInDemoRole('supervisor');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
