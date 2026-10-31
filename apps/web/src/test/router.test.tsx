import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

const PatientView = () => <div>Patient Home Content</div>;
const ClinicianView = () => <div>Clinician Queue Content</div>;
const LoginView = () => <div>Login Page Content</div>;

describe('ProtectedRoute Route Guard Integration', () => {
  beforeEach(() => {
    useAuthStore.getState().signOut();
  });

  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/clinician']}>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route
            path="/clinician"
            element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <ClinicianView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Content')).toBeTruthy();
    expect(screen.queryByText('Clinician Queue Content')).toBeNull();
  });

  it('redirects wrong-role users to their respective home route', () => {
    // Sign in as patient
    useAuthStore.getState().signInDemoRole('patient');

    render(
      <MemoryRouter initialEntries={['/clinician']}>
        <Routes>
          <Route path="/patient" element={<PatientView />} />
          <Route
            path="/clinician"
            element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <ClinicianView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Patient trying to access /clinician redirects to /patient
    expect(screen.getByText('Patient Home Content')).toBeTruthy();
    expect(screen.queryByText('Clinician Queue Content')).toBeNull();
  });

  it('allows authorized role user to view their protected route', () => {
    // Sign in as clinician
    useAuthStore.getState().signInDemoRole('clinician');

    render(
      <MemoryRouter initialEntries={['/clinician']}>
        <Routes>
          <Route path="/patient" element={<PatientView />} />
          <Route
            path="/clinician"
            element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <ClinicianView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Clinician Queue Content')).toBeTruthy();
  });
});
